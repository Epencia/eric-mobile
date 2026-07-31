import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  KeyboardAvoidingView, Platform, StyleSheet, ActivityIndicator,
  Alert, StatusBar, Modal, ScrollView, Image, Linking, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WebView } from 'react-native-webview';
import * as Speech from 'expo-speech'; // <-- AJOUT VOIX
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";

const API_URL = 'https://cyberic.xyz/api/ia-reservation.php';
const SCREEN_WIDTH = Dimensions.get('window').width;

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [loginInput, setLoginInput] = useState('');
  const [mdpInput, setMdpInput] = useState('');
  const [registerData, setRegisterData] = useState({ nom_prenom: '', email: '', telephone: '' });
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const flatListRef = useRef(null);
  const inputRef = useRef(null);

  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const [reservations, setReservations] = useState([]);
  const [recognizing, setRecognizing] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [reservationModalVisible, setReservationModalVisible] = useState(false);
  const [selectedPrestation, setSelectedPrestation] = useState(null);
  const [resForm, setResForm] = useState({ date_debut: '', date_fin: '', nombre_personnes: '1', quantite: '1', commentaire: '' });
  const [isReserving, setIsReserving] = useState(false);

  // ===== ÉTATS VOIX AJOUTÉS =====
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);

  const speak = (text) => {
    if (!text ||!autoSpeak) return;
    const cleanText = text.replace(/[*#_`]/g, '').substring(0, 4000);
    Speech.stop();
    setIsSpeaking(true);
    Speech.speak(cleanText, {
      language: 'fr-FR',
      rate: 1.0,
      pitch: 1.0,
      onDone: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  };

  const stopSpeaking = () => {
    Speech.stop();
    setIsSpeaking(false);
  };

  useSpeechRecognitionEvent("start", () => setRecognizing(true));
  useSpeechRecognitionEvent("end", () => setRecognizing(false));
  useSpeechRecognitionEvent("result", (event) => setInputText(event.results[0]?.transcript || ""));
  useSpeechRecognitionEvent("error", (event) => {
    setRecognizing(false);
  });

  const toggleVoiceRecognition = async () => {
    if (isSpeaking) stopSpeaking(); // Coupe Enora si elle parle
    if (recognizing) {
      await ExpoSpeechRecognitionModule.stop();
      setRecognizing(false);
      return;
    }
    try {
      const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!result.granted) return Alert.alert("Permission refusée", "Accès au microphone requis.");
      await ExpoSpeechRecognitionModule.start({ lang: "fr-FR", interimResults: true, continuous: false });
    } catch (error) {
      Alert.alert("Erreur", "Impossible de démarrer la reconnaissance vocale.");
    }
  };

  useEffect(() => {
    if (flatListRef.current) setTimeout(() => flatListRef.current.scrollToEnd({ animated: true }), 120);
  }, [messages, isLoading]);

  useEffect(() => {
    const welcome = `Bonjour! Je suis Enora, votre assistant de réservation intelligent.\n\n🏨 Je peux vous aider à :\n• Trouver des hôtels et restaurants\n• Consulter les chambres et menus disponibles\n• Voir les photos et localisations sur la carte\n• Effectuer des réservations (connexion requise)\n\nQue souhaitez-vous faire aujourd'hui?`;
    setMessages([{ role: 'assistant', content: welcome }]);
    // Optionnel: la faire parler au démarrage
    // setTimeout(() => speak("Bonjour! Je suis Enora, votre assistant de réservation."), 1000);
  }, []);

  const handleAuth = async () => {
    if (!loginInput.trim() ||!mdpInput.trim()) return Alert.alert('Erreur', 'Login et mot de passe requis');
    setIsLoggingIn(true);
    try {
      const action = isRegisterMode? 'register' : 'login';
      const payload = isRegisterMode
       ? { action,...registerData, login: loginInput, mdp: mdpInput }
        : { action, login: loginInput, mdp: mdpInput };
      const res = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (data.error) Alert.alert('Erreur', data.error);
      else if (data.success) {
        if (isRegisterMode) {
          Alert.alert('Succès', 'Compte créé! Connectez-vous.');
          setIsRegisterMode(false);
        } else {
          setUser(data.user);
          setIsLoggedIn(true);
          setAuthModalVisible(false);
          setTimeout(() => { if (selectedPrestation) setReservationModalVisible(true); }, 500);
          setLoginInput(''); setMdpInput('');
          speak(`Bienvenue ${data.user.nom_prenom}`);
        }
      }
    } catch (e) {
      Alert.alert('Erreur réseau', 'Impossible de contacter le serveur.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    stopSpeaking();
    Alert.alert('Déconnexion', 'Voulez-vous vraiment vous déconnecter?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Déconnexion', style: 'destructive', onPress: () => {
        setIsLoggedIn(false); setUser(null); setLoginInput(''); setMdpInput('');
      }}
    ]);
  };

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || isLoading) return;

    if(isSpeaking) stopSpeaking();

    let newMessages = [...messages];
    if (editingIndex!== null) {
      newMessages = newMessages.slice(0, editingIndex);
      newMessages.push({ role: 'user', content: text });
      setEditingIndex(null);
    } else {
      newMessages.push({ role: 'user', content: text });
    }
    setMessages(newMessages);
    setInputText(''); setIsLoading(true);

    try {
      const res = await fetch(API_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ask_ia', user_id: user?.utilisateur_id || 'guest', question: text })
      });
      const data = await res.json();
      if (data.error) {
        setMessages(prev => [...prev, { role: 'assistant', error: data.error, sql: data.sql }]);
        speak("Désolé, " + data.error);
      } else if (data.success) {
        setMessages(prev => [...prev, { role: 'assistant', results: data.results || [], sql: data.sql, count: data.count || 0 }]);

        // ===== GÉNÈRE LE TEXTE À DIRE =====
        let textToSpeak = "";
        if (data.results && data.results.length > 0) {
          if (data.results.length === 1) {
            const r = data.results[0];
            textToSpeak = `J'ai trouvé ${r.nom || 'un résultat'}. ${r.type || r.prestation_type || ''} ${r.description? '. ' + r.description.substring(0,150) : ''} ${r.prix? '. Prix: ' + r.prix + ' francs.' : ''}`;
          } else {
            textToSpeak = `J'ai trouvé ${data.count || data.results.length} résultats. Le premier est ${data.results[0].nom}. Vous pouvez consulter les fiches ou les images.`;
          }
        } else {
          textToSpeak = "Je n'ai trouvé aucun résultat pour votre recherche.";
        }
        speak(textToSpeak);
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', error: 'Erreur de connexion au serveur.' }]);
      speak("Erreur de connexion au serveur.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (index, content) => {
    if(isSpeaking) stopSpeaking();
    setInputText(content); setEditingIndex(index);
    setTimeout(() => inputRef.current?.focus(), 100);
  };
  const cancelEdit = () => { setInputText(''); setEditingIndex(null); };

  const openMap = (lat, lon, name) => {
    if (!lat ||!lon) return Alert.alert('Information', 'Coordonnées non disponibles');
    setSelectedLocation({ lat: parseFloat(lat), lon: parseFloat(lon), name });
    setMapModalVisible(true);
  };

  const openImage = (imageUrl) => {
    if (!imageUrl) return Alert.alert('Information', 'Aucune image disponible');
    const fullUrl = imageUrl.startsWith('http')? imageUrl : `https://cyberic.xyz/${imageUrl}`;
    setSelectedImage(fullUrl);
    setImageModalVisible(true);
  };

  const openReservationModal = (item) => {
    if(isSpeaking) stopSpeaking();
    setSelectedPrestation(item);
    if (!isLoggedIn) {
      setAuthModalVisible(true);
    } else {
      setResForm({ date_debut: new Date().toISOString().split('T')[0], date_fin: '', nombre_personnes: '1', quantite: '1', commentaire: '' });
      setReservationModalVisible(true);
    }
  };

  const submitReservation = async () => {
    if (!resForm.date_debut) return Alert.alert('Erreur', 'La date de début est obligatoire');
    setIsReserving(true);
    try {
      const montant = (parseFloat(selectedPrestation.prix || 0) * parseInt(resForm.quantite || 1)).toFixed(2);
      const res = await fetch(API_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_reservation', utilisateur_id: user.utilisateur_id,
          etablissement_id: selectedPrestation.etablissement_id, prestation_id: selectedPrestation.prestation_id,
          nom_client: user.nom_prenom, telephone: user.telephone || '', email: user.email || '',
          date_debut: resForm.date_debut, date_fin: resForm.date_fin || null,
          nombre_personnes: parseInt(resForm.nombre_personnes), quantite: parseInt(resForm.quantite),
          montant: montant, commentaire: resForm.commentaire
        })
      });
      const data = await res.json();
      if (data.error) Alert.alert('Erreur', data.error);
      else {
        Alert.alert('Succès', 'Réservation effectuée!');
        speak("Votre réservation a été effectuée avec succès.");
        setReservationModalVisible(false);
        loadReservations();
      }
    } catch (e) {
      Alert.alert('Erreur', 'Problème lors de la sauvegarde.');
    } finally {
      setIsReserving(false);
    }
  };

  const loadReservations = async () => {
    if (!user) return;
    try {
      const res = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'get_reservations', utilisateur_id: user.utilisateur_id }) });
      const data = await res.json();
      if (data.success) setReservations(data.reservations);
    } catch (e) { console.error(e); }
  };

  const openSidebarReservations = () => {
    if(isSpeaking) stopSpeaking();
    if (!isLoggedIn) {
      return Alert.alert('Connexion requise', 'Connectez-vous pour voir vos réservations.', [{ text: 'Se connecter', onPress: () => setAuthModalVisible(true) }]);
    }
    loadReservations();
    setIsSidebarVisible(true);
  };

  const renderMessage = ({ item, index }) => {
    if (item.role === 'user') {
      return (
        <View style={styles.userRow}>
          <View style={styles.userBubble}>
            <Text style={styles.userText} selectable>{item.content}</Text>
            <TouchableOpacity style={styles.editButton} onPress={() => handleEdit(index, item.content)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.editButtonText}>✏ Modifier</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
    return <AiMessage item={item} onOpenMap={openMap} onOpenImage={openImage} onReserve={openReservationModal} onSpeak={speak} />;
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.brand}>Enora IA {isSpeaking? '🔊' : ''}</Text>
          {isLoggedIn && <Text style={styles.headerUser}>👤 {user?.nom_prenom}</Text>}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => { if(isSpeaking) { stopSpeaking(); } else { setAutoSpeak(!autoSpeak); if(!autoSpeak) speak("Voix activée"); } }} style={[styles.logoutButtonSmall, { marginRight: 4, backgroundColor: autoSpeak? '#ede9fe' : '#f1f5f9' }]}>
            <Text style={styles.logoutTextSmall}>{autoSpeak? '🔊' : '🔇'}</Text>
          </TouchableOpacity>
          {isLoggedIn? (
            <>
              <TouchableOpacity onPress={openSidebarReservations} style={[styles.logoutButtonSmall, { marginRight: 4, backgroundColor: '#f0f9ff' }]}><Text style={styles.logoutTextSmall}>📜</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleLogout} style={styles.logoutButtonSmall}><Text style={styles.logoutTextSmall}>🔓</Text></TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity onPress={() => setAuthModalVisible(true)} style={[styles.logoutButtonSmall, { backgroundColor: '#f0f9ff' }]}>
              <Text style={styles.logoutTextSmall}>👤</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <KeyboardAvoidingView style={styles.chatArea} behavior={Platform.OS === 'ios'? 'padding' : 'padding'} keyboardVerticalOffset={Platform.OS === 'ios'? 0 : 10}>
        <FlatList ref={flatListRef} data={messages} keyExtractor={(_, i) => i.toString()} renderItem={renderMessage} contentContainerStyle={styles.listContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} />
        {isLoading && (
          <View style={styles.loadingRow}>
            <View style={styles.aiIcon}><Text style={styles.aiIconText}>E</Text></View>
            <ActivityIndicator color="#6c63ff" size="small" />
            <Text style={styles.loadingText}>Enora recherche...</Text>
          </View>
        )}
        {isSpeaking && (
          <View style={styles.speakingRow}>
            <Text style={styles.speakingText}>🔊 Enora parle...</Text>
            <TouchableOpacity onPress={stopSpeaking}><Text style={styles.stopText}>Arrêter</Text></TouchableOpacity>
          </View>
        )}
        <View style={styles.inputArea}>
          {editingIndex!== null && (
            <View style={styles.editingBanner}>
              <Text style={styles.editingText}>✏ Modification</Text>
              <TouchableOpacity onPress={cancelEdit}><Text style={styles.cancelEditText}>✕ Annuler</Text></TouchableOpacity>
            </View>
          )}
          <View style={styles.inputBar}>
            <TextInput ref={inputRef} style={styles.input} placeholder="Ex: Montre-moi les hôtels disponibles..." value={inputText} onChangeText={setInputText} multiline maxLength={1000} />
            <TouchableOpacity onPress={toggleVoiceRecognition} style={[styles.voiceButton, recognizing && styles.voiceButtonActive]}>
              <Text style={[styles.voiceButtonText, recognizing && { color: '#fff' }]}>{recognizing? '🎙' : '🎤'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.sendButton, inputText.trim() &&!isLoading? styles.sendButtonActive : null]} onPress={handleSend} disabled={!inputText.trim() || isLoading}>
              <Text style={[styles.sendButtonText, inputText.trim() &&!isLoading? { color: '#fff' } : null]}>{editingIndex!== null? '✓' : '➤'}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.disclaimer}>🔒 Enora peut faire des erreurs. Vérifiez les informations.</Text>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={authModalVisible} transparent animationType="fade" onRequestClose={() => setAuthModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>{isRegisterMode? 'Créer un compte' : 'Connexion requise'}</Text>
            <Text style={styles.modalSubtitle}>{isRegisterMode? 'Inscrivez-vous pour réserver' : 'Connectez-vous pour effectuer une réservation'}</Text>
            {isRegisterMode && (
              <>
                <View style={styles.inputWrapper}><Text style={styles.inputIcon}>👤</Text><TextInput style={styles.loginInput} placeholder="Nom complet" value={registerData.nom_prenom} onChangeText={t => setRegisterData({...registerData, nom_prenom: t})} /></View>
                <View style={styles.inputWrapper}><Text style={styles.inputIcon}>📧</Text><TextInput style={styles.loginInput} placeholder="Email" value={registerData.email} onChangeText={t => setRegisterData({...registerData, email: t})} keyboardType="email-address" /></View>
                <View style={styles.inputWrapper}><Text style={styles.inputIcon}>📱</Text><TextInput style={styles.loginInput} placeholder="Téléphone" value={registerData.telephone} onChangeText={t => setRegisterData({...registerData, telephone: t})} keyboardType="phone-pad" /></View>
              </>
            )}
            <View style={styles.inputWrapper}><Text style={styles.inputIcon}>🔑</Text><TextInput style={styles.loginInput} placeholder="Utilisateur" value={loginInput} onChangeText={setLoginInput} autoCapitalize="none" /></View>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputIcon}>🔒</Text>
              <TextInput style={[styles.loginInput, { flex: 1 }]} placeholder="Mot de passe" value={mdpInput} onChangeText={setMdpInput} secureTextEntry={!showPassword} onSubmitEditing={handleAuth} />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}><Text style={styles.eyeText}>{showPassword? '🙈' : '👁'}</Text></TouchableOpacity>
            </View>
            <TouchableOpacity style={[styles.loginButton, isLoggingIn && { opacity: 0.6 }]} onPress={handleAuth} disabled={isLoggingIn}>
              {isLoggingIn? <ActivityIndicator color="#fff" /> : <Text style={styles.loginButtonText}>{isRegisterMode? 'S\'inscrire' : 'Se connecter'}</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.forgotButton} onPress={() => setIsRegisterMode(!isRegisterMode)}>
              <Text style={styles.forgotButtonText}>{isRegisterMode? 'Déjà un compte? Se connecter' : 'Pas de compte? S\'inscrire'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setAuthModalVisible(false)}><Text style={styles.modalCloseText}>Annuler</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={isSidebarVisible} transparent animationType="slide" onRequestClose={() => setIsSidebarVisible(false)}>
        <View style={styles.sidebarOverlay}>
          <View style={styles.sidebarContainer}>
            <View style={styles.sidebarHeader}>
              <Text style={styles.sidebarTitle}>📜 Mes Réservations</Text>
              <TouchableOpacity onPress={() => setIsSidebarVisible(false)}><Text style={styles.sidebarClose}>✕</Text></TouchableOpacity>
            </View>
            {reservations.length === 0? (
              <Text style={styles.emptySidebarText}>Aucune réservation pour le moment.</Text>
            ) : (
              <FlatList data={reservations} keyExtractor={(item) => item.reservation_id}
                renderItem={({ item }) => (
                  <View style={styles.resHistoryCard}>
                    <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                      <Text style={styles.resHistoryName}>{item.etablissement_nom}</Text>
                      <Text style={[styles.resStatus, {color: item.statut === 'Confirmée'? '#16a34a' : '#f59e0b'}]}>{item.statut}</Text>
                    </View>
                    <Text style={styles.resHistoryDetail}>{item.prestation_type} : {item.prestation_nom}</Text>
                    <Text style={styles.resHistoryDetail}>📅 {item.date_debut} • 👥 {item.nombre_personnes} pers.</Text>
                    <Text style={styles.resHistoryDetail}>💰 {item.montant} FCFA</Text>
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={reservationModalVisible} transparent animationType="slide" onRequestClose={() => setReservationModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>📅 Confirmer la réservation</Text>
            {selectedPrestation && (
              <View style={styles.resSummary}>
                <Text style={styles.resSummaryName}>{selectedPrestation.nom}</Text>
                <Text style={styles.resSummaryPrice}>Prix: {selectedPrestation.prix} FCFA</Text>
              </View>
            )}
            <TextInput style={styles.modalInput} placeholder="Date de début (YYYY-MM-DD)" value={resForm.date_debut} onChangeText={t => setResForm({...resForm, date_debut: t})} />
            <TextInput style={styles.modalInput} placeholder="Date de fin (Optionnel)" value={resForm.date_fin} onChangeText={t => setResForm({...resForm, date_fin: t})} />
            <View style={{flexDirection: 'row', gap: 10, marginBottom: 12}}>
              <TextInput style={[styles.modalInput, {flex: 1, marginBottom: 0}]} placeholder="Personnes" keyboardType="numeric" value={resForm.nombre_personnes} onChangeText={t => setResForm({...resForm, nombre_personnes: t})} />
              <TextInput style={[styles.modalInput, {flex: 1, marginBottom: 0}]} placeholder="Quantité" keyboardType="numeric" value={resForm.quantite} onChangeText={t => setResForm({...resForm, quantite: t})} />
            </View>
            <TextInput style={[styles.modalInput, {height: 80}]} placeholder="Commentaire" multiline value={resForm.commentaire} onChangeText={t => setResForm({...resForm, commentaire: t})} />
            <TouchableOpacity style={[styles.resetButton, {marginTop: 8}]} onPress={submitReservation} disabled={isReserving}>
              {isReserving? <ActivityIndicator color="#fff" /> : <Text style={styles.resetButtonText}>✅ Valider la réservation</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setReservationModalVisible(false)}><Text style={styles.modalCloseText}>Annuler</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={mapModalVisible} transparent animationType="slide" onRequestClose={() => setMapModalVisible(false)}>
        <View style={styles.mapModalOverlay}>
          <View style={styles.mapModalContainer}>
            <View style={styles.mapModalHeader}>
              <Text style={styles.mapModalTitle}>📍 {selectedLocation?.name || 'Localisation'}</Text>
              <TouchableOpacity onPress={() => setMapModalVisible(false)} style={styles.mapCloseButton}><Text style={styles.mapCloseText}>✕</Text></TouchableOpacity>
            </View>
            {selectedLocation && (
              <>
                <WebView originWhitelist={['*']} source={{ html: `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>body{margin:0;padding:0;}#map{height:100vh;width:100%;}</style><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" /></head><body><div id="map"></div><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script>var map=L.map('map').setView([${selectedLocation.lat},${selectedLocation.lon}],15);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap'}).addTo(map);L.marker([${selectedLocation.lat},${selectedLocation.lon}]).addTo(map).bindPopup('${selectedLocation.name}').openPopup();</script></body></html>` }} style={styles.mapWebView} javaScriptEnabled={true} domStorageEnabled={true} />
                <View style={styles.mapActions}>
                  <TouchableOpacity style={styles.mapActionButton} onPress={() => Linking.openURL(`https://www.openstreetmap.org/?mlat=${selectedLocation.lat}&mlon=${selectedLocation.lon}&zoom=15`)}>
                    <Text style={styles.mapActionText}>🗺 Ouvrir dans le navigateur</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={imageModalVisible} transparent animationType="fade" onRequestClose={() => setImageModalVisible(false)}>
        <View style={styles.imageModalOverlay}>
          <TouchableOpacity style={styles.imageModalClose} onPress={() => setImageModalVisible(false)}><Text style={styles.imageModalCloseText}>✕</Text></TouchableOpacity>
          {selectedImage && <Image source={{ uri: selectedImage }} style={styles.imageModalImage} resizeMode="contain" />}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const AiMessage = React.memo(({ item, onOpenMap, onOpenImage, onReserve, onSpeak }) => {
  const [viewMode, setViewMode] = useState('fiche');

  if (item.error) {
    return (
      <View style={styles.aiRow}>
        <View style={styles.aiIcon}><Text style={styles.aiIconText}>E</Text></View>
        <View style={styles.aiContent}>
          <View style={styles.errorBox}><Text style={styles.errorText}>⚠ {item.error}</Text></View>
          {item.sql && (<View style={styles.sqlBlockError}><Text style={styles.sqlTextError} selectable>{item.sql}</Text></View>)}
        </View>
      </View>
    );
  }

  if(item.content){
    return (
      <View style={styles.aiRow}>
        <View style={styles.aiIcon}><Text style={styles.aiIconText}>E</Text></View>
        <View style={[styles.aiContent, {backgroundColor:'#f8fafc', padding:12, borderRadius:12}]}>
          <Text style={{fontSize:14, color:'#1e293b', lineHeight:20}} selectable>{item.content}</Text>
          <TouchableOpacity onPress={() => onSpeak && onSpeak(item.content)} style={{marginTop:8, alignSelf:'flex-start', backgroundColor:'#ede9fe', paddingHorizontal:10, paddingVertical:4, borderRadius:8}}>
            <Text style={{color:'#6c63ff', fontSize:12, fontWeight:'600'}}>🔊 Écouter</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  const allImages = [];
  if (item.results) {
    item.results.forEach((row, rowIdx) => {
      if (row.image) {
        const urls = String(row.image).split(';').map(u => u.trim()).filter(Boolean);
        urls.forEach((url, imgIdx) => {
          allImages.push({ uri: url.startsWith('http')? url : `https://cyberic.xyz/${url}`, name: row.nom || `Résultat #${rowIdx + 1}` });
        });
      }
    });
  }

  const hasImages = allImages.length > 0;
  const hasResults = item.results && item.results.length > 0;

  return (
    <View style={styles.aiRow}>
      <View style={styles.aiIcon}><Text style={styles.aiIconText}>E</Text></View>
      <View style={styles.aiContent}>
        {hasResults? (
          <View style={styles.resultsContainer}>
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsTitle}>📊 Résultats</Text>
              <View style={styles.resultsCountBadge}><Text style={styles.resultsCount}>{item.count || item.results.length} résultat(s)</Text></View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chartTabsScroll}>
              <View style={styles.chartTabs}>
                <TouchableOpacity style={[styles.chartTab, viewMode === 'fiche' && styles.chartTabActive]} onPress={() => setViewMode('fiche')}>
                  <Text style={[styles.chartTabText, viewMode === 'fiche' && styles.chartTabTextActive]}>📄 Fiche</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.chartTab, viewMode === 'cards' && styles.chartTabActive]} onPress={() => setViewMode('cards')}>
                  <Text style={[styles.chartTabText, viewMode === 'cards' && styles.chartTabTextActive]}>📋 Cartes</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.chartTab, viewMode === 'images' && styles.chartTabActive]} onPress={() => setViewMode('images')}>
                  <Text style={[styles.chartTabText, viewMode === 'images' && styles.chartTabTextActive]}>🖼 Images {hasImages? `(${allImages.length})` : ''}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View style={styles.resultsContent}>
              {viewMode === 'fiche' && (
                <ScrollView showsVerticalScrollIndicator style={{ maxHeight: 420 }}>
                  {item.results.length === 1? (
                    <View style={styles.ficheContainer}>
                      {Object.entries(item.results[0]).map(([key, value], i) => {
                        if (['etablissement_id', 'prestation_id', 'image'].includes(key)) return null;
                        return (<View key={i} style={styles.ficheRow}><Text style={styles.ficheLabel}>{key}</Text><Text style={styles.ficheValue} selectable>{value === null? '—' : String(value)}</Text></View>);
                      })}
                      <View style={{flexDirection:'row', gap:8, marginTop:10}}>
                        {(item.results[0].latitude && item.results[0].longitude) && (
                          <TouchableOpacity style={styles.mapButton} onPress={() => onOpenMap && onOpenMap(item.results[0].latitude, item.results[0].longitude, item.results[0].nom)}><Text style={styles.mapButtonText}>📍 Carte</Text></TouchableOpacity>
                        )}
                        <TouchableOpacity style={[styles.mapButton, {backgroundColor:'#ede9fe'}]} onPress={() => onSpeak && onSpeak(`${item.results[0].nom}. ${item.results[0].description || ''}. Prix ${item.results[0].prix || ''} francs.`)}><Text style={[styles.mapButtonText, {color:'#6c63ff'}]}>🔊 Écouter</Text></TouchableOpacity>
                      </View>
                      {item.results[0].etablissement_id && item.results[0].prestation_id && (
                        <TouchableOpacity style={styles.reserveButton} onPress={() => onReserve && onReserve(item.results[0])}><Text style={styles.reserveButtonText}>📅 Réserver</Text></TouchableOpacity>
                      )}
                    </View>
                  ) : (
                    <ScrollView horizontal nestedScrollEnabled><View>
                      <View style={styles.tableHeader}>{Object.keys(item.results[0]).filter(k =>!['etablissement_id', 'prestation_id', 'image'].includes(k)).map((key, idx) => (<View key={idx} style={[styles.tableCell, styles.tableCellHeader, { minWidth: 110 }]}><Text style={styles.tableHeaderText}>{key}</Text></View>))}</View>
                      {item.results.slice(0, 30).map((row, rowIndex) => (<View key={rowIndex} style={[styles.tableRow, rowIndex % 2 === 0? styles.tableRowEven : styles.tableRowOdd]}>{Object.entries(row).filter(([k]) =>!['etablissement_id', 'prestation_id', 'image'].includes(k)).map(([_, value], colIndex) => (<View key={colIndex} style={[styles.tableCell, { minWidth: 110 }]}><Text style={styles.tableCellText} numberOfLines={2}>{value === null? '—' : String(value)}</Text></View>))}</View>))}
                    </View></ScrollView>
                  )}
                </ScrollView>
              )}
              {viewMode === 'cards' && (
                <ScrollView showsVerticalScrollIndicator style={{ maxHeight: 420 }}>
                  {item.results.map((row, idx) => {
                    const firstImage = row.image? String(row.image).split(';')[0].trim() : null;
                    const imageUri = firstImage? (firstImage.startsWith('http')? firstImage : `https://cyberic.xyz/${firstImage}`) : null;
                    return (
                      <View key={idx} style={styles.resultCard}>
                        {imageUri && (<TouchableOpacity style={styles.resultImageContainer} onPress={() => onOpenImage && onOpenImage(row.image)}><Image source={{ uri: imageUri }} style={styles.resultImage} resizeMode="cover" /><View style={styles.imageOverlay}><Text style={styles.imageOverlayText}>🔍 Voir les photos</Text></View></TouchableOpacity>)}
                        <View style={styles.resultCardHeader}><Text style={styles.resultCardIndex}>#{idx + 1}</Text>
                          <View style={{flexDirection:'row', gap:6}}>
                            <TouchableOpacity style={[styles.mapButton, {backgroundColor:'#ede9fe'}]} onPress={() => onSpeak && onSpeak(`${row.nom}. ${row.description || ''}`)}><Text style={[styles.mapButtonText, {color:'#6c63ff'}]}>🔊</Text></TouchableOpacity>
                            {(row.latitude && row.longitude) && (<TouchableOpacity style={styles.mapButton} onPress={() => onOpenMap && onOpenMap(row.latitude, row.longitude, row.nom)}><Text style={styles.mapButtonText}>📍 Carte</Text></TouchableOpacity>)}
                          </View>
                        </View>
                        {Object.entries(row).map(([key, value], i) => { if (['etablissement_id', 'prestation_id', 'image', 'latitude', 'longitude'].includes(key)) return null; return (<View key={i} style={styles.resultRow}><Text style={styles.resultLabel} numberOfLines={1}>{key}</Text><Text style={styles.resultValue} selectable>{value === null? '—' : String(value)}</Text></View>); })}
                        {row.etablissement_id && row.prestation_id && (<TouchableOpacity style={styles.reserveButton} onPress={() => onReserve && onReserve(row)}><Text style={styles.reserveButtonText}>📅 Réserver cet élément</Text></TouchableOpacity>)}
                      </View>
                    );
                  })}
                </ScrollView>
              )}
              {viewMode === 'images' && (
                <ScrollView showsVerticalScrollIndicator style={{ maxHeight: 420 }}>
                  {!hasImages? (<View style={styles.noImageBox}><Text style={styles.noImageText}>Aucune image disponible</Text></View>) : (
                    <View style={styles.imagesGrid}>{allImages.map((img, idx) => (<TouchableOpacity key={idx} style={styles.imageGridItem} onPress={() => onOpenImage && onOpenImage(img.uri)} activeOpacity={0.85}><Image source={{ uri: img.uri }} style={styles.imageGridThumb} resizeMode="cover" /><Text style={styles.imageGridLabel} numberOfLines={1}>{img.name}</Text></TouchableOpacity>))}</View>
                  )}
                </ScrollView>
              )}
            </View>
          </View>
        ) : (<View style={styles.noResultBox}><Text style={styles.aiText}>✅ Requête exécutée, aucun résultat.</Text></View>)}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', backgroundColor: '#ffffff' },
  headerLeft: { flex: 1 },
  headerUser: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  brand: { fontSize: 18, fontWeight: '800', color: '#6c63ff' },
  logoutButtonSmall: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fef2f2', justifyContent: 'center', alignItems: 'center', marginLeft: 4 },
  logoutTextSmall: { fontSize: 16 },
  chatArea: { flex: 1, backgroundColor: '#ffffff' },
  listContent: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 20, flexGrow: 1 },
  userRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 14 },
  userBubble: { backgroundColor: '#f0f4f9', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 18, borderBottomRightRadius: 6, maxWidth: '88%' },
  userText: { fontSize: 15, color: '#1a1a2e', lineHeight: 21 },
  editButton: { marginTop: 8, alignSelf: 'flex-end' },
  editButtonText: { fontSize: 12, color: '#6c63ff', fontWeight: '600' },
  aiRow: { flexDirection: 'row', marginBottom: 16, alignItems: 'flex-start' },
  aiIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#6c63ff', justifyContent: 'center', alignItems: 'center', marginRight: 10, marginTop: 2 },
  aiIconText: { color: 'white', fontSize: 14, fontWeight: 'bold' },
  aiContent: { flex: 1, maxWidth: '88%' },
  errorBox: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 12, padding: 12 },
  errorText: { color: '#b91c1c', fontSize: 14, lineHeight: 20 },
  sqlBlockError: { backgroundColor: '#1e293b', borderRadius: 8, padding: 10, marginTop: 8 },
  sqlTextError: { fontFamily: Platform.OS === 'ios'? 'Menlo' : 'monospace', fontSize: 11, color: '#fca5a5', lineHeight: 16 },
  noResultBox: { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 12, padding: 12 },
  aiText: { fontSize: 14, color: '#166534', lineHeight: 20 },
  resultsContainer: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, overflow: 'hidden', backgroundColor: '#ffffff' },
  resultsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11, backgroundColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  resultsTitle: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  resultsCountBadge: { backgroundColor: '#ede9fe', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  resultsCount: { fontSize: 11, color: '#6c63ff', fontWeight: '600' },
  chartTabsScroll: { marginHorizontal: 14, marginTop: 12, marginBottom: 8 },
  chartTabs: { flexDirection: 'row', backgroundColor: '#f1f5f9', padding: 4, borderRadius: 8, gap: 4 },
  chartTab: { paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center', borderRadius: 6, minWidth: 70 },
  chartTabActive: { backgroundColor: '#ffffff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  chartTabText: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  chartTabTextActive: { color: '#6c63ff' },
  resultsContent: { flex: 1, minHeight: 200, maxHeight: 500 },
  resultCard: { paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  resultCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  resultCardIndex: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
  resultRow: { flexDirection: 'row', marginBottom: 5, alignItems: 'flex-start' },
  resultLabel: { fontSize: 12, fontWeight: '600', color: '#64748b', width: 100, marginRight: 8 },
  resultValue: { fontSize: 13, color: '#1e293b', flex: 1, flexWrap: 'wrap' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, marginHorizontal: 14, marginBottom: 8, backgroundColor: '#f8fafc', borderRadius: 12 },
  loadingText: { marginLeft: 10, color: '#64748b', fontSize: 13 },
  speakingRow: { flexDirection: 'row', alignItems: 'center', justifyContent:'space-between', paddingVertical: 10, paddingHorizontal: 16, marginHorizontal: 14, marginBottom: 8, backgroundColor: '#ede9fe', borderRadius: 12 },
  speakingText: { color: '#6c63ff', fontSize: 13, fontWeight:'600' },
  stopText: { color: '#ef4444', fontSize: 13, fontWeight:'700' },
  inputArea: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: Platform.OS === 'ios'? 12 : 18, borderTopWidth: 1, borderTopColor: '#e5e7eb', backgroundColor: '#ffffff' },
  editingBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f0f4ff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, marginBottom: 8 },
  editingText: { fontSize: 13, color: '#6c63ff', fontWeight: '600' },
  cancelEditText: { fontSize: 13, color: '#ef4444', fontWeight: '600' },
  inputBar: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 24, paddingHorizontal: 14, paddingVertical: 6, alignItems: 'flex-end' },
  input: { flex: 1, fontSize: 15, color: '#1e293b', maxHeight: 110, minHeight: 40, paddingVertical: 10, paddingRight: 8, lineHeight: 21 },
  voiceButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center', marginLeft: 4, marginBottom: 2 },
  voiceButtonActive: { backgroundColor: '#ef4444' },
  voiceButtonText: { fontSize: 18 },
  sendButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center', marginLeft: 4, marginBottom: 2 },
  sendButtonActive: { backgroundColor: '#6c63ff' },
  sendButtonText: { color: '#94a3b8', fontSize: 18, fontWeight: 'bold' },
  disclaimer: { textAlign: 'center', fontSize: 11, color: '#94a3b8', marginTop: 8 },
  sidebarOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-start' },
  sidebarContainer: { width: '85%', maxWidth: 350, height: '100%', backgroundColor: '#ffffff', borderTopRightRadius: 20, borderBottomRightRadius: 20, paddingTop: 50, paddingHorizontal: 16 },
  sidebarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  sidebarTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a2e' },
  sidebarClose: { fontSize: 22, color: '#64748b', padding: 4 },
  emptySidebarText: { textAlign: 'center', color: '#94a3b8', fontSize: 14, marginTop: 40 },
  resHistoryCard: { backgroundColor: '#f8fafc', padding: 14, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  resHistoryName: { fontSize: 15, fontWeight: '700', color: '#1e293b', flex: 1 },
  resStatus: { fontSize: 12, fontWeight: '700' },
  resHistoryDetail: { fontSize: 13, color: '#64748b', marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  modalContainer: { backgroundColor: '#ffffff', borderRadius: 20, padding: 28, width: '100%', maxWidth: 380 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1a1a2e', marginBottom: 12, textAlign: 'center' },
  modalSubtitle: { fontSize: 13, color: '#6b7280', textAlign: 'center', marginBottom: 20 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 14, paddingHorizontal: 14 },
  inputIcon: { fontSize: 18, marginRight: 10 },
  loginInput: { flex: 1, paddingVertical: 14, fontSize: 16, color: '#1e293b' },
  eyeButton: { padding: 6 },
  eyeText: { fontSize: 18 },
  loginButton: { backgroundColor: '#6c63ff', borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
  loginButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  forgotButton: { alignItems: 'center', paddingVertical: 14, marginTop: 4 },
  forgotButtonText: { fontSize: 14, color: '#6c63ff', fontWeight: '600' },
  modalCloseButton: { marginTop: 20, paddingVertical: 12, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  modalCloseText: { fontSize: 14, color: '#64748b', fontWeight: '600' },
  modalInput: { backgroundColor: '#f1f5f9', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 14, paddingVertical: 14, fontSize: 15, color: '#1e293b', marginBottom: 12 },
  resetButton: { backgroundColor: '#6c63ff', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  resetButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  resSummary: { backgroundColor: '#f0fdf4', padding: 12, borderRadius: 10, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#16a34a' },
  resSummaryName: { fontSize: 16, fontWeight: '700', color: '#166534' },
  resSummaryPrice: { fontSize: 14, color: '#15803d', marginTop: 4 },
  reserveButton: { backgroundColor: '#16a34a', paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginTop: 12 },
  reserveButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  resultImageContainer: { position: 'relative', width: '100%', height: 180, borderRadius: 12, overflow: 'hidden', marginBottom: 12, backgroundColor: '#f1f5f9' },
  resultImage: { width: '100%', height: '100%' },
  imageOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.6)', padding: 8, alignItems: 'center' },
  imageOverlayText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  mapButton: { backgroundColor: '#6c63ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  mapButtonText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#6c63ff', borderRadius: 8, marginBottom: 4, paddingVertical: 8 },
  tableRow: { flexDirection: 'row', borderRadius: 4, paddingVertical: 4, minHeight: 36 },
  tableRowEven: { backgroundColor: '#f8fafc' },
  tableRowOdd: { backgroundColor: '#ffffff' },
  tableCell: { paddingHorizontal: 8, paddingVertical: 6, borderRightWidth: 0.5, borderRightColor: '#e5e7eb' },
  tableCellHeader: { borderRightColor: 'rgba(255,255,255,0.2)' },
  tableHeaderText: { fontSize: 12, fontWeight: '700', color: '#ffffff', textAlign: 'left' },
  tableCellText: { fontSize: 12, color: '#1e293b' },
  mapModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)' },
  mapModalContainer: { flex: 1, backgroundColor: '#fff', marginTop: Platform.OS === 'ios'? 50 : 30, borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' },
  mapModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  mapModalTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  mapCloseButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fef2f2', justifyContent: 'center', alignItems: 'center' },
  mapCloseText: { fontSize: 18, color: '#ef4444', fontWeight: 'bold' },
  mapWebView: { flex: 1, width: '100%' },
  mapActions: { padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  mapActionButton: { backgroundColor: '#6c63ff', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  mapActionText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  imageModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  imageModalClose: { position: 'absolute', top: 50, right: 20, zIndex: 10, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  imageModalCloseText: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  imageModalImage: { width: '100%', height: '80%' },
  ficheContainer: { padding: 14 },
  ficheRow: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  ficheLabel: { width: 110, fontSize: 12, fontWeight: '600', color: '#64748b' },
  ficheValue: { flex: 1, fontSize: 13, color: '#1e293b' },
  noImageBox: { padding: 40, alignItems: 'center' },
  noImageText: { fontSize: 14, color: '#94a3b8', textAlign: 'center' },
  imagesGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 10, justifyContent: 'space-between' },
  imageGridItem: { width: '48%', marginBottom: 12, borderRadius: 12, overflow: 'hidden', backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e5e7eb' },
  imageGridThumb: { width: '100%', height: 120 },
  imageGridLabel: { fontSize: 12, color: '#475569', padding: 8, fontWeight: '500' },
});