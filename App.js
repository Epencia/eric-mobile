import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  KeyboardAvoidingView, Platform, StyleSheet, ActivityIndicator,
  Alert, RefreshControl, StatusBar, Modal, Dimensions, ScrollView, Linking, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BarChart, LineChart, PieChart } from 'react-native-gifted-charts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import { WebView } from 'react-native-webview';
// Import conditionnel — évite le crash dans Expo Go
let ExpoSpeechRecognitionModule = null;
let useSpeechRecognitionEvent = () => {};

try {
  const speechRecognition = require("expo-speech-recognition");
  ExpoSpeechRecognitionModule = speechRecognition.ExpoSpeechRecognitionModule;
  useSpeechRecognitionEvent = speechRecognition.useSpeechRecognitionEvent;
} catch (e) {
  console.warn("🎤 Reconnaissance vocale non disponible (Expo Go ou module manquant)");
}

const API_URL = 'https://cyberic.xyz/api/ia-base.php';
const RESET_URL = 'https://cyberic.xyz/api/retrouve-acces.php';
const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - 60;

export default function App() {
  // ===== TOUS LES ÉTATS EXISTANTS =====
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [loginInput, setLoginInput] = useState('');
  const [mdpInput, setMdpInput] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [forgotModalVisible, setForgotModalVisible] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const resetEmailRef = useRef(null);

  // État pour le modal de modification des accès
  const [editCredentialsModalVisible, setEditCredentialsModalVisible] = useState(false);
  const [newLogin, setNewLogin] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingCredentials, setIsUpdatingCredentials] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // États pour la surveillance des bases
  const [isMonitoringMode, setIsMonitoringMode] = useState(false);
  const [monitoringData, setMonitoringData] = useState([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [monitoringInterval, setMonitoringInterval] = useState(null);
  const [monitoringStatus, setMonitoringStatus] = useState('arrêté'); // 'arrêté', 'en cours', 'erreur'
  const [dbStats, setDbStats] = useState({
    connections: 0,
    tables: [],
    totalColumns: 0,
    totalRows: 0,
    totalSize: '0 Mo',
    alerts: []
  });

  const [bases, setBases] = useState([]);
  const [selectedBase, setSelectedBase] = useState(null);
  const [isLoadingBases, setIsLoadingBases] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const flatListRef = useRef(null);
  const inputRef = useRef(null);

  const [indicators, setIndicators] = useState([]);
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [saveIndicatorModalVisible, setSaveIndicatorModalVisible] = useState(false);
  const [isSavingIndicator, setIsSavingIndicator] = useState(false);
  const [newIndicatorName, setNewIndicatorName] = useState('');
  const [newIndicatorDesc, setNewIndicatorDesc] = useState('');
  const [newIndicatorSql, setNewIndicatorSql] = useState('');

  const [alertThresholds, setAlertThresholds] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [alertModalVisible, setAlertModalVisible] = useState(false);
  const [thresholdModalVisible, setThresholdModalVisible] = useState(false);
  const [currentThresholdIndicator, setCurrentThresholdIndicator] = useState(null);
  const [tempMin, setTempMin] = useState('');
  const [tempMax, setTempMax] = useState('');

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [recognizing, setRecognizing] = useState(false);

  // ================================================================
  // FONCTIONS VOIX
  // ================================================================
  const speak = (text) => {
    if (!text || !autoSpeak) return;
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

  useSpeechRecognitionEvent("start", () => {
    setRecognizing(true);
    console.log("🎤 Reconnaissance démarrée");
  });

  useSpeechRecognitionEvent("end", () => {
    setRecognizing(false);
    console.log("🎤 Reconnaissance terminée");
  });

  useSpeechRecognitionEvent("result", (event) => {
    const text = event.results[0]?.transcript || "";
    setInputText(text);
    console.log("📝 Texte reconnu:", text);
  });

  useSpeechRecognitionEvent("error", (event) => {
    console.log("❌ Erreur reconnaissance:", event.error, event.message);
    setRecognizing(false);
    Alert.alert("Erreur", "Erreur de reconnaissance vocale: " + (event.message || event.error));
  });

  const toggleVoiceRecognition = async () => {
    if (!ExpoSpeechRecognitionModule) {
      Alert.alert(
        "Non disponible",
        "La reconnaissance vocale nécessite l'application installée et non la simulation."
      );
      return;
    }
    if (isSpeaking) stopSpeaking();
    if (recognizing) {
      try {
        await ExpoSpeechRecognitionModule.stop();
        setRecognizing(false);
        console.log("🎤 Arrêt de l'écoute");
      } catch (e) {
        console.error("Erreur arrêt:", e);
      }
      return;
    }
    try {
      const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!result.granted) {
        Alert.alert("Permission refusée", "Vous devez autoriser l'accès au microphone.");
        return;
      }
      await ExpoSpeechRecognitionModule.start({
        lang: "fr-FR",
        interimResults: true,
        continuous: false,
      });
      console.log("🎤 En écoute...");
    } catch (error) {
      console.error("❌ Erreur démarrage voix:", error);
      Alert.alert("Erreur", "Impossible de démarrer la reconnaissance vocale.");
      setRecognizing(false);
    }
  };

  // ================================================================
  // FONCTIONS DE SURVEILLANCE DES BASES DE DONNÉES
  // ================================================================
  const toggleMonitoringMode = async () => {
    if (isSpeaking) stopSpeaking();
    if (isMonitoringMode) {
      stopMonitoring();
      setIsMonitoringMode(false);
      setMonitoringData([]);
    } else {
      setIsMonitoringMode(true);
      await startMonitoring();
    }
  };

  const startMonitoring = async () => {
    if (!selectedBase || !user) {
      Alert.alert('Erreur', 'Aucune base sélectionnée.');
      return;
    }

    setMonitoringStatus('en cours');
    setIsMonitoring(true);
    
    // Exécuter immédiatement une surveillance
    await fetchDatabaseStats();

    // Mettre en place un intervalle de surveillance (toutes les 30 secondes)
    const interval = setInterval(async () => {
      await fetchDatabaseStats();
    }, 30000);
    
    setMonitoringInterval(interval);
    speak(`Surveillance de la base ${selectedBase.nom_base} activée`);
  };

  const stopMonitoring = () => {
    if (monitoringInterval) {
      clearInterval(monitoringInterval);
      setMonitoringInterval(null);
    }
    setIsMonitoring(false);
    setMonitoringStatus('arrêté');
    speak('Surveillance arrêtée');
  };

  const fetchDatabaseStats = async () => {
    if (!selectedBase || !user) return;

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'monitoring',
          user_id: user.id,
          base_id: selectedBase.base_id,
          monitoring_action: 'stats'
        })
      });
      const data = await res.json();
      
      if (data.success) {
        const newStats = {
          connections: data.connections || 0,
          tables: data.tables || [],
          totalColumns: data.total_columns || 0,
          totalRows: data.total_rows || 0,
          totalSize: data.total_size || '0 Mo',
          alerts: data.alerts || []
        };
        setDbStats(newStats);
        setMonitoringData(prev => [newStats, ...prev].slice(0, 50));
        
        // Ajouter une alerte si la taille dépasse 100 Mo
        if (newStats.alerts && newStats.alerts.length > 0) {
          newStats.alerts.forEach(alert => {
            const alertMessage = `🚨 ${alert.table}: ${alert.message}`;
            setMessages(prev => [...prev, { 
              role: 'assistant', 
              content: alertMessage,
              isAlert: true 
            }]);
            if (autoSpeak) {
              speak(`Alerte ${alert.table}: ${alert.message}`);
            }
          });
        }
        
        // Ajouter un message de statut
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `📊 Statistiques de ${selectedBase.nom_base}: ${newStats.tables.length} tables, ${newStats.totalRows} enregistrements, taille ${newStats.totalSize}`
        }]);
      } else {
        setMonitoringStatus('erreur');
        console.error('Erreur monitoring:', data.error);
      }
    } catch (e) {
      setMonitoringStatus('erreur');
      console.error('Erreur fetch monitoring:', e);
    }
  };

  // ================================================================
  // FONCTIONS DE MODIFICATION DES ACCÈS
  // ================================================================
  const openEditCredentialsModal = () => {
    if (isSpeaking) stopSpeaking();
    setNewLogin(user?.login || '');
    setNewPassword('');
    setConfirmPassword('');
    setEditCredentialsModalVisible(true);
  };

  const handleUpdateCredentials = async () => {
    const login = newLogin.trim();
    const password = newPassword.trim();
    const confirm = confirmPassword.trim();

    if (!login) {
      Alert.alert('Erreur', 'Le login est obligatoire.');
      return;
    }

    if (password && password !== confirm) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas.');
      return;
    }

    setIsUpdatingCredentials(true);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_credentials',
          user_id: user.id,
          login: login,
          password: password || undefined
        })
      });
      const data = await res.json();
      
      if (data.success) {
        setUser({ ...user, login: login });
        Alert.alert('Succès', 'Vos accès ont été modifiés avec succès.');
        setEditCredentialsModalVisible(false);
        speak('Vos accès ont été modifiés.');
      } else {
        Alert.alert('Erreur', data.error || 'Impossible de modifier les accès.');
      }
    } catch (e) {
      Alert.alert('Erreur réseau', 'Impossible de communiquer avec le serveur.');
    } finally {
      setIsUpdatingCredentials(false);
    }
  };

  // ================================================================
  // FONCTIONS RENDER MESSAGE
  // ================================================================
  const renderMessage = ({ item, index }) => {
    if (item.role === 'user') {
      return (
        <View style={styles.userRow}>
          <View style={styles.userBubble}>
            <Text style={styles.userText} selectable>{item.content}</Text>
            <TouchableOpacity style={styles.editButton} onPress={() => handleEdit(index, item.content)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.editButtonText}>✏️ Modifier</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
    return <AiMessage 
      item={item} 
      onSaveIndicator={(sql) => { setNewIndicatorSql(sql); setSaveIndicatorModalVisible(true); }}
      onSpeak={speak}
    />;
  };

  // ================================================================
  // AUTRES FONCTIONS
  // ================================================================
  useEffect(() => {
    if (flatListRef.current) {
      setTimeout(() => flatListRef.current.scrollToEnd({ animated: true }), 120);
    }
  }, [messages, isLoading]);

  useEffect(() => {
    loadThresholds();
    loadAlerts();
  }, []);

  const loadThresholds = async () => {
    try {
      const saved = await AsyncStorage.getItem('eric_thresholds');
      if (saved) setAlertThresholds(JSON.parse(saved));
    } catch (e) { console.error('Erreur chargement seuils', e); }
  };

  const loadAlerts = async () => {
    try {
      const saved = await AsyncStorage.getItem('eric_alerts');
      if (saved) setAlerts(JSON.parse(saved));
    } catch (e) { console.error('Erreur chargement alertes', e); }
  };

  const saveThresholds = async (thresholds) => {
    try {
      await AsyncStorage.setItem('eric_thresholds', JSON.stringify(thresholds));
    } catch (e) { console.error('Erreur sauvegarde seuils', e); }
  };

  const saveAlertsData = async (alertsData) => {
    try {
      await AsyncStorage.setItem('eric_alerts', JSON.stringify(alertsData));
    } catch (e) { console.error('Erreur sauvegarde alertes', e); }
  };

  const showToast = (title, message, type = 'info') => {
    Alert.alert(title, message);
  };

  const checkAlerts = (data, indicatorName, indicatorId) => {
    const threshold = alertThresholds[indicatorId];
    if (!threshold) return;
    const firstValue = data[0] ? Object.values(data[0])[0] : null;
    if (firstValue !== null && !isNaN(parseFloat(firstValue))) {
      const value = parseFloat(firstValue);
      if (threshold.min !== undefined && value < threshold.min) {
        showToast(`🔴 Alerte ${indicatorName}`, `Valeur ${value} inférieure au seuil min ${threshold.min}`, 'error');
        addAlert(indicatorName, value, 'min', threshold.min);
      }
      if (threshold.max !== undefined && value > threshold.max) {
        showToast(`🔴 Alerte ${indicatorName}`, `Valeur ${value} supérieure au seuil max ${threshold.max}`, 'error');
        addAlert(indicatorName, value, 'max', threshold.max);
      }
    }
  };

  const addAlert = async (indicatorName, value, type, threshold) => {
    const newAlert = {
      id: Date.now().toString(),
      indicator: indicatorName,
      value: value,
      type: type,
      threshold: threshold,
      time: new Date().toLocaleString()
    };
    const updatedAlerts = [newAlert, ...alerts];
    setAlerts(updatedAlerts);
    await saveAlertsData(updatedAlerts);
  };

  const removeAlert = async (index) => {
    const updatedAlerts = alerts.filter((_, i) => i !== index);
    setAlerts(updatedAlerts);
    await saveAlertsData(updatedAlerts);
  };

  const openThresholdModal = (indicatorId, indicatorName) => {
    if (isSpeaking) stopSpeaking();
    setCurrentThresholdIndicator({ id: indicatorId, name: indicatorName });
    const current = alertThresholds[indicatorId] || {};
    setTempMin(current.min !== undefined ? String(current.min) : '');
    setTempMax(current.max !== undefined ? String(current.max) : '');
    setThresholdModalVisible(true);
  };

  const saveThreshold = async () => {
    const min = tempMin !== '' ? parseFloat(tempMin) : undefined;
    const max = tempMax !== '' ? parseFloat(tempMax) : undefined;
    const newThresholds = { ...alertThresholds };
    if (min === undefined && max === undefined) {
      delete newThresholds[currentThresholdIndicator.id];
    } else {
      newThresholds[currentThresholdIndicator.id] = { min, max };
    }
    setAlertThresholds(newThresholds);
    await saveThresholds(newThresholds);
    setThresholdModalVisible(false);
    showToast('Succès', `Seuils mis à jour pour "${currentThresholdIndicator.name}"`, 'success');
  };

  const handleLogin = async () => {
    if (!loginInput.trim() || !mdpInput.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir le login et le mot de passe.');
      return;
    }
    setIsLoggingIn(true);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', login: loginInput.trim(), mdp: mdpInput.trim() })
      });
      const data = await res.json();
      if (data.error) Alert.alert('Erreur de connexion', data.error);
      else if (data.success && data.user) {
        setUser(data.user);
        setIsLoggedIn(true);
        setLoginInput(''); setMdpInput('');
        fetchBases(data.user.id);
        speak(`Bienvenue ${data.user.nom}`);
      }
    } catch (e) {
      Alert.alert('Erreur réseau', 'Impossible de se connecter au serveur.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const openForgotModal = () => {
    if (isSpeaking) stopSpeaking();
    setResetEmail(''); setResetSuccess(false); setResetMessage('');
    setForgotModalVisible(true);
    setTimeout(() => resetEmailRef.current?.focus(), 300);
  };
  const closeForgotModal = () => {
    setForgotModalVisible(false); setResetEmail(''); setResetSuccess(false); setResetMessage('');
  };
  const handleResetPassword = async () => {
    const email = resetEmail.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Alert.alert('Erreur', 'Veuillez saisir une adresse email valide.');
      return;
    }
    setIsResetting(true); setResetMessage('');
    try {
      const res = await fetch(RESET_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (data.error) { setResetSuccess(false); setResetMessage(data.error); }
      else { setResetSuccess(true); setResetMessage(data.message || 'Vos accès ont été envoyés.'); }
    } catch (e) {
      setResetSuccess(false); setResetMessage('Erreur de connexion au serveur.');
    } finally { setIsResetting(false); }
  };

  const fetchBases = useCallback(async (userId, isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setIsLoadingBases(true);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_bases', user_id: userId })
      });
      const data = await res.json();
      if (data.error) Alert.alert('Erreur', data.error);
      else setBases(data.bases || []);
    } catch (e) {
      Alert.alert('Erreur réseau', 'Impossible de charger les bases.');
    } finally {
      setIsLoadingBases(false); setRefreshing(false);
    }
  }, []);

  const selectBase = async (base) => {
    if (isSpeaking) stopSpeaking();
    if (isMonitoringMode) {
      stopMonitoring();
      setIsMonitoringMode(false);
    }
    setSelectedBase(base);
    setMessages([]); setEditingIndex(null); setInputText(''); setSearchQuery('');
    setDbStats({ connections: 0, tables: [], totalColumns: 0, totalRows: 0, totalSize: '0 Mo', alerts: [] });
    setMonitoringData([]);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_indicateurs', user_id: user.id, base_id: base.base_id })
      });
      const data = await res.json();
      if (data.success) setIndicators(data.indicateurs || []);
    } catch (e) {
      console.error('Erreur chargement indicateurs', e);
    }
    speak(`Base sélectionnée: ${base.nom_base}`);
  };

  const handleLogout = () => {
    stopSpeaking();
    if (isMonitoringMode) {
      stopMonitoring();
      setIsMonitoringMode(false);
    }
    Alert.alert('Déconnexion', 'Voulez-vous vraiment vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Déconnexion', style: 'destructive',
        onPress: () => {
          setIsLoggedIn(false); setUser(null); setBases([]); setSelectedBase(null);
          setMessages([]); setLoginInput(''); setMdpInput(''); setEditingIndex(null);
          setIndicators([]);
        }
      }
    ]);
  };

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || isLoading || !selectedBase || !user) return;
    if (isSpeaking) stopSpeaking();
    let newMessages = [...messages];
    if (editingIndex !== null) {
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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ask_ia', user_id: user.id, base_id: selectedBase.base_id, question: text })
      });
      const data = await res.json();
      if (data.error) {
        setMessages(prev => [...prev, { role: 'assistant', error: data.error, sql: data.sql || null }]);
        speak("Désolé, " + data.error);
      } else if (data.success) {
        setMessages(prev => [...prev, { role: 'assistant', results: data.results || [], sql: data.sql, count: data.count || 0 }]);
        if (data.results && data.results.length > 0) {
          let textToSpeak = `J'ai trouvé ${data.count || data.results.length} résultats.`;
          if (data.results.length === 1) {
            const r = data.results[0];
            const firstKey = Object.keys(r)[0];
            const firstValue = r[firstKey];
            textToSpeak = `Résultat: ${firstKey} ${firstValue}. `;
            const secondKey = Object.keys(r)[1];
            if (secondKey) textToSpeak += `${secondKey}: ${r[secondKey]}. `;
          }
          speak(textToSpeak);
        } else {
          speak("Aucun résultat trouvé pour votre recherche.");
        }
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', error: 'Erreur de connexion au serveur.' }]);
      speak("Erreur de connexion au serveur.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecuteIndicator = async (indicateur) => {
    if (isSpeaking) stopSpeaking();
    setIsLoading(true);
    setMessages(prev => [...prev, { role: 'user', content: `📊 Exécution : ${indicateur.nom}` }]);
    setIsSidebarVisible(false);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'execute_indicateur', user_id: user.id, indicateur_id: indicateur.indicateur_id })
      });
      const data = await res.json();
      if (data.error) {
        setMessages(prev => [...prev, { role: 'assistant', error: data.error, sql: indicateur.requete_sql }]);
        speak("Erreur lors de l'exécution de l'indicateur.");
      } else if (data.success) {
        if (data.results && data.results.length > 0) {
          checkAlerts(data.results, indicateur.nom, indicateur.indicateur_id);
        }
        setMessages(prev => [...prev, {
          role: 'assistant', results: data.results || [], sql: data.sql || indicateur.requete_sql,
          count: data.count || 0, isIndicator: true, nom: data.nom, indicatorId: indicateur.indicateur_id
        }]);
        if (data.results && data.results.length > 0) {
          speak(`Indicateur ${indicateur.nom}: ${data.count || data.results.length} résultats trouvés.`);
        } else {
          speak(`Indicateur ${indicateur.nom} exécuté, aucun résultat.`);
        }
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', error: 'Erreur de connexion au serveur.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveIndicator = async () => {
    if (!newIndicatorName.trim() || !newIndicatorSql.trim()) {
      Alert.alert('Erreur', 'Le nom et la requête SQL sont obligatoires.');
      return;
    }
    setIsSavingIndicator(true);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_indicateur', user_id: user.id, base_id: selectedBase.base_id,
          nom: newIndicatorName.trim(), description: newIndicatorDesc.trim(), requete_sql: newIndicatorSql.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert('Succès', 'Indicateur sauvegardé avec succès.');
        speak(`Indicateur ${newIndicatorName} sauvegardé.`);
        setSaveIndicatorModalVisible(false);
        setNewIndicatorName(''); setNewIndicatorDesc(''); setNewIndicatorSql('');
        const resInd = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get_indicateurs', user_id: user.id, base_id: selectedBase.base_id })
        });
        const dataInd = await resInd.json();
        if (dataInd.success) setIndicators(dataInd.indicateurs || []);
      } else {
        Alert.alert('Erreur', data.error || 'Impossible de sauvegarder.');
      }
    } catch (e) {
      Alert.alert('Erreur réseau', 'Impossible de sauvegarder l\'indicateur.');
    } finally {
      setIsSavingIndicator(false);
    }
  };

  const handleDeleteIndicator = (indicateur) => {
    if (isSpeaking) stopSpeaking();
    Alert.alert(
      'Supprimer l\'indicateur',
      `Voulez-vous vraiment supprimer "${indicateur.nom}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer', style: 'destructive',
          onPress: async () => {
            try {
              const res = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete_indicateur', user_id: user.id, indicateur_id: indicateur.indicateur_id })
              });
              const data = await res.json();
              if (data.success) {
                setIndicators(prev => prev.filter(ind => ind.indicateur_id !== indicateur.indicateur_id));
                Alert.alert('Succès', 'Indicateur supprimé.');
              } else {
                Alert.alert('Erreur', data.error || 'Impossible de supprimer.');
              }
            } catch (e) {
              Alert.alert('Erreur réseau', 'Impossible de communiquer avec le serveur.');
            }
          }
        }
      ]
    );
  };

  const handleEdit = (index, content) => {
    if (isSpeaking) stopSpeaking();
    setInputText(content); setEditingIndex(index);
    setTimeout(() => inputRef.current?.focus(), 100);
  };
  const cancelEdit = () => { setInputText(''); setEditingIndex(null); };

  // ================================================================
  // MODALS
  // ================================================================
  const renderForgotModal = () => (
    <Modal visible={forgotModalVisible} transparent animationType="fade" onRequestClose={closeForgotModal}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={styles.modalIconWrapper}><Text style={styles.modalIcon}>🔑</Text></View>
            <Text style={styles.modalTitle}>Mot de passe oublié</Text>
            <Text style={styles.modalSubtitle}>Saisissez votre adresse email pour recevoir vos accès</Text>
          </View>
          {resetSuccess ? (
            <View style={styles.resetSuccessBox}>
              <Text style={styles.resetSuccessIcon}>✅</Text>
              <Text style={styles.resetSuccessText}>{resetMessage}</Text>
              <Text style={styles.resetSuccessHint}>Vérifiez votre boîte de réception et vos spams.</Text>
            </View>
          ) : (
            <View style={styles.modalBody}>
              <View style={styles.resetInputWrapper}>
                <Text style={styles.resetInputIcon}>📧</Text>
                <TextInput ref={resetEmailRef} style={styles.resetInput} placeholder="votre@email.com" placeholderTextColor="#94a3b8"
                  value={resetEmail} onChangeText={setResetEmail} keyboardType="email-address" autoCapitalize="none"
                  returnKeyType="send" onSubmitEditing={handleResetPassword} />
              </View>
              {resetMessage ? <View style={styles.resetErrorBox}><Text style={styles.resetErrorText}>⚠️ {resetMessage}</Text></View> : null}
              <TouchableOpacity style={[styles.resetButton, isResetting && { opacity: 0.6 }]} onPress={handleResetPassword} disabled={isResetting}>
                {isResetting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.resetButtonText}>Envoyer mes accès</Text>}
              </TouchableOpacity>
            </View>
          )}
          <TouchableOpacity style={styles.modalCloseButton} onPress={closeForgotModal}>
            <Text style={styles.modalCloseText}>{resetSuccess ? 'Fermer' : 'Annuler'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderEditCredentialsModal = () => (
    <Modal visible={editCredentialsModalVisible} transparent animationType="fade" onRequestClose={() => setEditCredentialsModalVisible(false)}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { maxWidth: 400 }]}>
          <View style={styles.modalHeader}>
            <View style={styles.modalIconWrapper}><Text style={styles.modalIcon}>🔐</Text></View>
            <Text style={styles.modalTitle}>Modifier mes accès</Text>
            <Text style={styles.modalSubtitle}>Modifiez votre login et/ou mot de passe</Text>
          </View>
          <View style={styles.modalBody}>
            <View style={styles.resetInputWrapper}>
              <Text style={styles.resetInputIcon}>👤</Text>
              <TextInput style={styles.resetInput} placeholder="Nouveau login *" placeholderTextColor="#94a3b8" value={newLogin} onChangeText={setNewLogin} autoCapitalize="none" />
            </View>
            <View style={styles.resetInputWrapper}>
              <Text style={styles.resetInputIcon}>🔒</Text>
              <TextInput style={[styles.resetInput, { flex: 1 }]} placeholder="Nouveau mot de passe" placeholderTextColor="#94a3b8" value={newPassword} onChangeText={setNewPassword} secureTextEntry={!showNewPassword} />
              <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)} style={styles.eyeButton}><Text style={styles.eyeText}>{showNewPassword ? '🙈' : '👁️'}</Text></TouchableOpacity>
            </View>
            <View style={styles.resetInputWrapper}>
              <Text style={styles.resetInputIcon}>✓</Text>
              <TextInput style={[styles.resetInput, { flex: 1 }]} placeholder="Confirmer le mot de passe" placeholderTextColor="#94a3b8" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry={!showConfirmPassword} />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeButton}><Text style={styles.eyeText}>{showConfirmPassword ? '🙈' : '👁️'}</Text></TouchableOpacity>
            </View>
            <Text style={{ fontSize: 11, color: '#94a3b8', marginBottom: 16, textAlign: 'center' }}>
              Laissez le mot de passe vide pour le conserver inchangé.
            </Text>
            <TouchableOpacity style={[styles.resetButton, isUpdatingCredentials && { opacity: 0.6 }]} onPress={handleUpdateCredentials} disabled={isUpdatingCredentials}>
              {isUpdatingCredentials ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.resetButtonText}>💾 Mettre à jour</Text>}
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.modalCloseButton} onPress={() => setEditCredentialsModalVisible(false)}>
            <Text style={styles.modalCloseText}>Annuler</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderSaveIndicatorModal = () => (
    <Modal visible={saveIndicatorModalVisible} transparent animationType="fade" onRequestClose={() => setSaveIndicatorModalVisible(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={styles.modalIconWrapper}><Text style={styles.modalIcon}>💾</Text></View>
            <Text style={styles.modalTitle}>Sauvegarder l'indicateur</Text>
            <Text style={styles.modalSubtitle}>Donnez un nom et une description à cette requête</Text>
          </View>
          <View style={styles.modalBody}>
            <View style={styles.resetInputWrapper}>
              <Text style={styles.resetInputIcon}>📝</Text>
              <TextInput style={styles.resetInput} placeholder="Nom de l'indicateur *" placeholderTextColor="#94a3b8" value={newIndicatorName} onChangeText={setNewIndicatorName} autoCapitalize="none" />
            </View>
            <View style={[styles.resetInputWrapper, { alignItems: 'flex-start', paddingVertical: 10 }]}>
              <Text style={{ fontSize: 14, marginRight: 10 }}>📄</Text>
              <TextInput style={[styles.resetInput, { minHeight: 70, textAlignVertical: 'top' }]} placeholder="Description (optionnel)" placeholderTextColor="#94a3b8" value={newIndicatorDesc} onChangeText={setNewIndicatorDesc} multiline numberOfLines={3} />
            </View>
            <View style={styles.sqlPreviewBox}>
              <Text style={styles.sqlPreviewLabel}>Requête SQL :</Text>
              <ScrollView style={{ maxHeight: 100 }} nestedScrollEnabled>
                <Text style={styles.sqlPreviewText} selectable>{newIndicatorSql}</Text>
              </ScrollView>
            </View>
            <TouchableOpacity style={[styles.resetButton, { marginTop: 16 }, isSavingIndicator && { opacity: 0.6 }]} onPress={handleSaveIndicator} disabled={isSavingIndicator}>
              {isSavingIndicator ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.resetButtonText}>💾 Sauvegarder</Text>}
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.modalCloseButton} onPress={() => setSaveIndicatorModalVisible(false)}>
            <Text style={styles.modalCloseText}>Annuler</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderThresholdModal = () => (
    <Modal visible={thresholdModalVisible} transparent animationType="fade" onRequestClose={() => setThresholdModalVisible(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={styles.modalIconWrapper}>
              <Text style={styles.modalIcon}>🔔</Text>
            </View>
            <Text style={styles.modalTitle}>Configurer une alerte</Text>
            <Text style={styles.modalSubtitle}>{currentThresholdIndicator?.name}</Text>
          </View>
          <View style={styles.modalBody}>
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
              <View style={[styles.resetInputWrapper, { flex: 1, marginBottom: 0 }]}>
                <Text style={styles.resetInputIcon}>📉</Text>
                <TextInput style={styles.resetInput} placeholder="Seuil Min" keyboardType="numeric" value={tempMin} onChangeText={setTempMin} />
              </View>
              <View style={[styles.resetInputWrapper, { flex: 1, marginBottom: 0 }]}>
                <Text style={styles.resetInputIcon}>📈</Text>
                <TextInput style={styles.resetInput} placeholder="Seuil Max" keyboardType="numeric" value={tempMax} onChangeText={setTempMax} />
              </View>
            </View>
            <Text style={{ fontSize: 12, color: '#64748b', textAlign: 'center', marginBottom: 16 }}>
              Laissez un champ vide pour ignorer ce seuil.
            </Text>
            <TouchableOpacity style={[styles.resetButton, { marginTop: 8 }]} onPress={saveThreshold}>
              <Text style={styles.resetButtonText}>💾 Sauvegarder les seuils</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.modalCloseButton} onPress={() => setThresholdModalVisible(false)}>
            <Text style={styles.modalCloseText}>Annuler</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderAlertModal = () => (
    <Modal visible={alertModalVisible} transparent animationType="fade" onRequestClose={() => setAlertModalVisible(false)}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { maxWidth: 420 }]}>
          <View style={[styles.modalHeader, { backgroundColor: '#fef3c7', borderRadius: 20 }]}>
            <Text style={styles.modalTitle}>🔔 Alertes indicateurs</Text>
          </View>
          <View style={styles.modalBody}>
            {alerts.length === 0 ? (
              <Text style={{ textAlign: 'center', color: '#64748b', paddingVertical: 20 }}>✅ Aucune alerte active</Text>
            ) : (
              alerts.map((alert, idx) => (
                <View key={idx} style={styles.alertItem}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.alertIndicatorName}>📊 {alert.indicator}</Text>
                    <TouchableOpacity onPress={() => removeAlert(idx)}>
                      <Text style={{ color: '#ef4444', fontSize: 16 }}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.alertIndicatorValue}>{alert.value}</Text>
                  <Text style={styles.alertIndicatorThreshold}>
                    Seuil {alert.type === 'min' ? 'minimum' : 'maximum'} : {alert.threshold} • {alert.time}
                  </Text>
                </View>
              ))
            )}
          </View>
          <TouchableOpacity style={styles.modalCloseButton} onPress={() => setAlertModalVisible(false)}>
            <Text style={styles.modalCloseText}>Fermer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderSidebar = () => (
    <Modal visible={isSidebarVisible} transparent animationType="slide" onRequestClose={() => setIsSidebarVisible(false)}>
      <View style={styles.sidebarOverlay}>
        <View style={styles.sidebarContainer}>
          <View style={styles.sidebarHeader}>
            <Text style={styles.sidebarTitle}>📊 Indicateurs</Text>
            <TouchableOpacity onPress={() => setIsSidebarVisible(false)}><Text style={styles.sidebarClose}>✕</Text></TouchableOpacity>
          </View>
          <View style={styles.searchContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput style={styles.searchInput} placeholder="Rechercher..." value={searchQuery} onChangeText={setSearchQuery} />
          </View>
          <FlatList
            data={indicators.filter(ind => ind.nom.toLowerCase().includes(searchQuery.toLowerCase()) || (ind.description && ind.description.toLowerCase().includes(searchQuery.toLowerCase())))}
            keyExtractor={(item) => item.indicateur_id.toString()}
            renderItem={({ item }) => (
              <View style={styles.indicatorItem}>
                <TouchableOpacity style={styles.indicatorContent} onPress={() => handleExecuteIndicator(item)} activeOpacity={0.7}>
                  <Text style={styles.indicatorName} numberOfLines={1}>📊 {item.nom}</Text>
                  <Text style={styles.indicatorDesc} numberOfLines={2}>{item.description || 'Aucune description'}</Text>
                </TouchableOpacity>
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  <TouchableOpacity style={[styles.deleteIndicatorButton, { backgroundColor: '#fef3c7', borderColor: '#fcd34d' }]} onPress={() => openThresholdModal(item.indicateur_id, item.nom)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Text style={{ fontSize: 16 }}>🔔</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteIndicatorButton} onPress={() => handleDeleteIndicator(item)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Text style={styles.deleteIndicatorIcon}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            ListEmptyComponent={<Text style={styles.emptySidebarText}>Aucun indicateur trouvé.</Text>}
          />
        </View>
      </View>
    </Modal>
  );

  // ================================================================
  // RENDU PRINCIPAL
  // ================================================================
  if (!isLoggedIn) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <KeyboardAvoidingView style={styles.loginContainer} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.loginIcon}><Text style={styles.loginIconText}>E</Text></View>
          <Text style={styles.loginTitle}>Eric IA</Text>
          <Text style={styles.loginSubtitle}>Connectez-vous pour accéder à vos bases de données</Text>
          <View style={styles.loginForm}>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputIcon}>👤</Text>
              <TextInput style={styles.loginInput} placeholder="Utilisateur" placeholderTextColor="#94a3b8" value={loginInput} onChangeText={setLoginInput} autoCapitalize="none" returnKeyType="next" />
            </View>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputIcon}>🔒</Text>
              <TextInput style={[styles.loginInput, { flex: 1 }]} placeholder="Mot de passe" placeholderTextColor="#94a3b8" value={mdpInput} onChangeText={setMdpInput} secureTextEntry={!showPassword} returnKeyType="done" onSubmitEditing={handleLogin} />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}><Text style={styles.eyeText}>{showPassword ? '🙈' : '👁️'}</Text></TouchableOpacity>
            </View>
            <TouchableOpacity style={[styles.loginButton, isLoggingIn && { opacity: 0.6 }]} onPress={handleLogin} disabled={isLoggingIn}>
              {isLoggingIn ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginButtonText}>Se connecter</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.forgotButton} onPress={openForgotModal}><Text style={styles.forgotButtonText}>Mot de passe oublié ?</Text></TouchableOpacity>
          </View>
          <Text style={styles.loginFooter}>🔐 Connexion sécurisée via le serveur</Text>
        </KeyboardAvoidingView>
        {renderForgotModal()}
      </SafeAreaView>
    );
  }

  if (!selectedBase) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.brand}>Eric</Text>
            <Text style={styles.headerUser}>👤 {user?.nom}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => { if(isSpeaking) { stopSpeaking(); } else { setAutoSpeak(!autoSpeak); if(!autoSpeak) speak("Voix activée"); } }} style={[styles.logoutButtonSmall, { marginRight: 4, backgroundColor: autoSpeak ? '#ede9fe' : '#f1f5f9' }]}>
              <Text style={styles.logoutTextSmall}>{autoSpeak ? '🔊' : '🔇'}</Text>
            </TouchableOpacity>
             <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}><Text style={styles.logoutText}>🔓</Text></TouchableOpacity>
          </View>
        </View>
        <View style={styles.basesContainer}>
          <Text style={styles.basesTitle}>📂 Vos bases de données</Text>
          <Text style={styles.basesSubtitle}>{bases.length} base(s) active(s) • Sélectionnez pour interroger</Text>
          {isLoadingBases ? (
            <View style={styles.loadingCenter}><ActivityIndicator size="large" color="#6c63ff" /><Text style={styles.loadingText}>Chargement...</Text></View>
          ) : bases.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🗄️</Text>
              <Text style={styles.noBasesText}>Aucune base de données active associée à votre compte.</Text>
              <TouchableOpacity style={styles.refreshButton} onPress={() => fetchBases(user.id, true)}><Text style={styles.refreshButtonText}>🔄 Actualiser</Text></TouchableOpacity>
            </View>
          ) : (
            <FlatList data={bases} keyExtractor={(item) => item.acces_id || item.base_id} contentContainerStyle={{ paddingBottom: 30 }} showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchBases(user.id, true)} colors={['#6c63ff']} />}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.baseCard} onPress={() => selectBase(item)} activeOpacity={0.7}>
                  <View style={styles.baseCardHeader}>
                    <View style={styles.baseIconWrapper}><Text style={styles.baseIconText}>🗄️</Text></View>
                    <View style={styles.baseInfo}>
                      <Text style={styles.baseName} numberOfLines={1}>{item.nom_base}</Text>
                      <Text style={styles.baseHost} numberOfLines={1}>🌐 {item.hote}</Text>
                    </View>
                    <View style={styles.baseStatusBadge}><Text style={styles.baseStatusText}>● {item.statut}</Text></View>
                  </View>
                  <View style={styles.baseTablesSection}>
                    {item.all_tables ? (
                      <><Text style={styles.baseTablesLabel}>📋 Accès complet</Text><Text style={styles.baseTablesAll}>🌐 Toutes les tables de la base sont autorisées</Text></>
                    ) : (
                      <><Text style={styles.baseTablesLabel}>📋 {item.tables_list?.length || 0} table(s) autorisée(s)</Text><Text style={styles.baseTables} numberOfLines={2}>{item.tables_list?.join(', ') || 'Aucune table configurée'}</Text></>
                    )}
                  </View>
                  <View style={styles.baseCardFooter}><Text style={styles.baseAction}>Interroger cette base →</Text></View>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </SafeAreaView>
    );
  }

  // Mode Surveillance des bases de données
  if (isMonitoringMode) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#0a0a1a' }]} edges={["top", "bottom"]}>
        <View style={[styles.header, { backgroundColor: '#0a0a1a', borderBottomColor: 'rgba(255,255,255,0.1)' }]}>
          <TouchableOpacity onPress={() => { toggleMonitoringMode(); setSelectedBase(null); setMessages([]); setIndicators([]); }} style={styles.backButton}>
            <Text style={styles.backText}>← Bases</Text>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[styles.logoutButtonSmall, { marginRight: 8, backgroundColor: isMonitoring ? '#dcfce7' : '#fef2f2' }]}>
              <Text style={{ fontSize: 16 }}>{isMonitoring ? '🟢' : '🔴'}</Text>
            </View>
            <TouchableOpacity onPress={toggleMonitoringMode} style={[styles.logoutButtonSmall, { marginRight: 4, backgroundColor: '#fef2f2' }]}>
              <Text style={styles.logoutTextSmall}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.monitoringContainer}>
          <View style={styles.monitoringHeader}>
            <Text style={styles.monitoringTitle}>🗄️ Surveillance des bases</Text>
            <Text style={styles.monitoringSubtitle}>
              {selectedBase?.nom_base} • {isMonitoring ? 'Surveillance active' : 'Surveillance arrêtée'}
            </Text>
            <Text style={[styles.monitoringStatus, { color: isMonitoring ? '#22c55e' : '#ef4444' }]}>
              {isMonitoring ? '🟢 En cours' : '⏸ Arrêtée'}
            </Text>
          </View>

          <View style={styles.monitoringControls}>
            <TouchableOpacity 
              style={[styles.monitoringButton, isMonitoring ? styles.monitoringButtonStop : styles.monitoringButtonStart]}
              onPress={() => {
                if (isMonitoring) {
                  stopMonitoring();
                } else {
                  startMonitoring();
                }
              }}
            >
              <Text style={styles.monitoringButtonText}>
                {isMonitoring ? '⏹ Arrêter' : '▶️ Démarrer'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.monitoringButton, { backgroundColor: '#6c63ff' }]}
              onPress={fetchDatabaseStats}
            >
              <Text style={styles.monitoringButtonText}>🔄 Rafraîchir</Text>
            </TouchableOpacity>
          </View>

          {/* Statistiques de la base */}
          <View style={styles.monitoringStatsGrid}>
            <View style={styles.monitoringStatCard}>
              <Text style={styles.monitoringStatLabel}>🔌 Connexions</Text>
              <Text style={styles.monitoringStatValue}>{dbStats.connections}</Text>
            </View>
            <View style={styles.monitoringStatCard}>
              <Text style={styles.monitoringStatLabel}>📋 Tables</Text>
              <Text style={styles.monitoringStatValue}>{dbStats.tables.length}</Text>
            </View>
            <View style={styles.monitoringStatCard}>
              <Text style={styles.monitoringStatLabel}>📝 Colonnes</Text>
              <Text style={styles.monitoringStatValue}>{dbStats.totalColumns}</Text>
            </View>
            <View style={styles.monitoringStatCard}>
              <Text style={styles.monitoringStatLabel}>📊 Enregistrements</Text>
              <Text style={styles.monitoringStatValue}>{dbStats.totalRows.toLocaleString()}</Text>
            </View>
            <View style={[styles.monitoringStatCard, { gridColumn: 'span 2' }]}>
              <Text style={styles.monitoringStatLabel}>💾 Taille totale</Text>
              <Text style={[styles.monitoringStatValue, dbStats.totalSize && parseFloat(dbStats.totalSize) > 100 ? { color: '#ef4444' } : null]}>
                {dbStats.totalSize}
                {dbStats.totalSize && parseFloat(dbStats.totalSize) > 100 && ' ⚠️'}
              </Text>
            </View>
          </View>

          {/* Alertes de taille */}
          {dbStats.alerts && dbStats.alerts.length > 0 && (
            <View style={styles.monitoringAlerts}>
              <Text style={styles.monitoringAlertsTitle}>🚨 Alertes taille (>100 Mo)</Text>
              {dbStats.alerts.map((alert, idx) => (
                <View key={idx} style={[styles.monitoringAlertItem, { borderLeftColor: '#ef4444' }]}>
                  <Text style={styles.monitoringAlertText}>
                    📊 {alert.table}: {alert.message}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Liste des tables */}
          <View style={styles.monitoringTables}>
            <Text style={styles.monitoringTablesTitle}>📋 Détail des tables</Text>
            <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator>
              {dbStats.tables.map((table, idx) => (
                <View key={idx} style={styles.monitoringTableItem}>
                  <View style={styles.monitoringTableHeader}>
                    <Text style={styles.monitoringTableName}>📊 {table.name}</Text>
                    <Text style={styles.monitoringTableRows}>{table.rows?.toLocaleString() || 0} lignes</Text>
                  </View>
                  <View style={styles.monitoringTableDetails}>
                    <Text style={styles.monitoringTableDetail}>Colonnes: {table.columns || 0}</Text>
                    <Text style={[styles.monitoringTableDetail, table.size && parseFloat(table.size) > 100 ? { color: '#ef4444', fontWeight: 'bold' } : null]}>
                      Taille: {table.size || '0 Mo'}
                      {table.size && parseFloat(table.size) > 100 && ' ⚠️'}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>

          <View style={styles.monitoringStatus}>
            <Text style={styles.monitoringStatusText}>
              {isMonitoring ? '🟢 Surveillance active - Mise à jour toutes les 30s' : '⏸ Surveillance en pause'}
            </Text>
            <Text style={[styles.monitoringStatusText, { fontSize: 11, color: '#64748b', marginTop: 4 }]}>
              Dernière mise à jour: {new Date().toLocaleTimeString()}
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Mode Chat normal
  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { setSelectedBase(null); setMessages([]); setIndicators([]); }} style={styles.backButton}>
            <Text style={styles.backText}>← Bases</Text>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => { if(isSpeaking) { stopSpeaking(); } else { setAutoSpeak(!autoSpeak); if(!autoSpeak) speak("Voix activée"); } }} style={[styles.logoutButtonSmall, { marginRight: 4, backgroundColor: autoSpeak ? '#ede9fe' : '#f1f5f9' }]}>
              <Text style={styles.logoutTextSmall}>{autoSpeak ? '🔊' : '🔇'}</Text>
            </TouchableOpacity>
            {isSpeaking && (
              <TouchableOpacity onPress={stopSpeaking} style={[styles.logoutButtonSmall, { marginRight: 4, backgroundColor: '#fef2f2' }]}>
                <Text style={styles.logoutTextSmall}>⏹</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity onPress={() => setAlertModalVisible(true)} style={[styles.logoutButtonSmall, { marginRight: 4, backgroundColor: '#fef3c7' }]}>
              <Text style={styles.logoutTextSmall}>🔔</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setIsSidebarVisible(true)} style={[styles.logoutButtonSmall, { marginRight: 4, backgroundColor: '#f0f9ff' }]}>
              <Text style={styles.logoutTextSmall}>📊</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={toggleMonitoringMode} style={[styles.logoutButtonSmall, { marginRight: 4, backgroundColor: '#f0f9ff' }]}>
              <Text style={styles.logoutTextSmall}>🗄️</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={openEditCredentialsModal} style={styles.logoutButtonSmall}>
              <Text style={styles.logoutTextSmall}>👤</Text>
            </TouchableOpacity>
          </View>
        </View>

        <KeyboardAvoidingView style={styles.chatArea} behavior={Platform.OS === 'ios' ? 'padding' : 'padding'} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 10}>
          <FlatList ref={flatListRef} data={messages} keyExtractor={(_, i) => i.toString()} renderItem={renderMessage} contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.welcome}>
                <View style={styles.welcomeIcon}><Text style={styles.welcomeIconText}>E</Text></View>
                <Text style={styles.welcomeTitle}>Bonjour, je suis Eric</Text>
                <Text style={styles.welcomeText}>Votre assistant IA connecté à votre base de données.{'\n'}Base : {selectedBase.nom_base}</Text>
                <View style={styles.welcomeTables}>
                  <Text style={styles.welcomeTablesTitle}>Tables disponibles :</Text>
                  {selectedBase.all_tables ? (
                    <Text style={styles.welcomeTablesList}>🌐 Toutes les tables de la base "{selectedBase.nom_base}"</Text>
                  ) : (
                    <Text style={styles.welcomeTablesList}>{selectedBase.tables_list?.join(', ')}</Text>
                  )}
                </View>
                
              </View>
            }
          />
          {isLoading && (
            <View style={styles.loadingRow}>
              <View style={styles.aiIcon}><Text style={styles.aiIconText}>E</Text></View>
              <ActivityIndicator color="#6c63ff" size="small" />
              <Text style={styles.loadingText}>Eric traite votre demande...</Text>
            </View>
          )}
          {isSpeaking && (
            <View style={styles.speakingRow}>
              <Text style={styles.speakingText}>🔊 Eric parle...</Text>
              <TouchableOpacity onPress={stopSpeaking}><Text style={styles.stopText}>Arrêter</Text></TouchableOpacity>
            </View>
          )}
          <View style={styles.inputArea}>
            {editingIndex !== null && (
              <View style={styles.editingBanner}>
                <Text style={styles.editingText}>✏️ Modification de la question</Text>
                <TouchableOpacity onPress={cancelEdit}><Text style={styles.cancelEditText}>✕ Annuler</Text></TouchableOpacity>
              </View>
            )}
            <View style={styles.inputBar}>
              <TextInput ref={inputRef} style={styles.input} placeholder="Posez votre question..." placeholderTextColor="#94a3b8" value={inputText} onChangeText={setInputText} multiline maxLength={1000} />
              <TouchableOpacity onPress={toggleVoiceRecognition} style={[styles.voiceButton, recognizing && styles.voiceButtonActive]}>
                <Text style={[styles.voiceButtonText, recognizing && { color: '#fff' }]}>{recognizing ? '🎙️' : '🎤'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.sendButton, inputText.trim() && !isLoading ? styles.sendButtonActive : null]} onPress={handleSend} disabled={!inputText.trim() || isLoading}>
                <Text style={[styles.sendButtonText, inputText.trim() && !isLoading ? { color: '#fff' } : null]}>{editingIndex !== null ? '✓' : '➤'}</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.disclaimer}>🔒 Eric peut faire des erreurs. Vérifiez les informations importantes.</Text>
          </View>
        </KeyboardAvoidingView>
      </>

      {renderSidebar()}
      {renderSaveIndicatorModal()}
      {renderAlertModal()}
      {renderThresholdModal()}
      {renderEditCredentialsModal()}
    </SafeAreaView>
  );
}

// ================================================================
// COMPOSANT : MESSAGE IA (AVEC WEBVIEWS INTÉGRÉES)
// ================================================================
const AiMessage = React.memo(({ item, onSaveIndicator, onSpeak }) => {
  const [showSql, setShowSql] = useState(false);
  const [viewMode, setViewMode] = useState('cards');
  const [isChartExpanded, setIsChartExpanded] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(10);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [mediaModalVisible, setMediaModalVisible] = useState(false);
  const [webViewErrors, setWebViewErrors] = useState({});

  // ================================================================
  // FONCTIONS DE VALIDATION DES URLs
  // ================================================================
  const isValidUrl = (url) => {
    if (!url) return false;
    const trimmed = url.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      try {
        new URL(trimmed);
        return true;
      } catch (e) {
        return false;
      }
    }
    return false;
  };

  const getSafeUrl = (url) => {
    if (isValidUrl(url)) return url;
    return 'about:blank';
  };

  const handleWebViewError = (id) => {
    setWebViewErrors(prev => ({ ...prev, [id]: true }));
  };

  // ================================================================
  // EXTRACTION DES MÉDIAS
  // ================================================================
  const extractMedia = (results) => {
    if (!results || results.length === 0) return { images: [], videos: [], documents: [], pages: [], coordinates: [] };

    const images = [];
    const videos = [];
    const documents = [];
    const pages = [];
    const coordinates = [];

    const splitUrls = (str) => {
      if (!str) return [];
      return str.split(/[;,]\s*/).filter(u => u.trim().length > 0);
    };

    results.forEach((row, rowIdx) => {
      Object.entries(row).forEach(([key, value]) => {
        if (!value) return;
        const strValue = String(value);
        
        if ((key.toLowerCase().includes('latitude') || key.toLowerCase().includes('lat')) && 
            !isNaN(parseFloat(strValue))) {
          const lat = parseFloat(strValue);
          const lonKey = Object.keys(row).find(k => 
            k.toLowerCase().includes('longitude') || 
            k.toLowerCase().includes('lon') || 
            k.toLowerCase().includes('lng')
          );
          if (lonKey && row[lonKey] && !isNaN(parseFloat(row[lonKey]))) {
            coordinates.push({
              lat: lat,
              lon: parseFloat(row[lonKey]),
              name: row.nom || row.name || `Point ${coordinates.length + 1}`,
              rowIndex: rowIdx
            });
          }
        }

        const youtubePattern = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=)?([^\s&]+)/i;
        if (youtubePattern.test(strValue) && isValidUrl(strValue)) {
          const urls = splitUrls(strValue);
          urls.forEach(url => {
            if (youtubePattern.test(url) && isValidUrl(url)) {
              videos.push({ 
                uri: url.trim(), 
                name: row.nom || row.name || `Vidéo ${videos.length + 1}`,
                key: key,
                rowIndex: rowIdx,
                isYouTube: true
              });
            }
          });
          return;
        }

        if ((strValue.match(/^https?:\/\/.*\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)/i) && isValidUrl(strValue)) ||
            strValue.match(/^data:image\/[a-zA-Z]+;base64,/)) {
          const urls = splitUrls(strValue);
          urls.forEach(url => {
            if (isValidUrl(url) || url.startsWith('data:image')) {
              images.push({ 
                uri: url.trim(), 
                name: row.nom || row.name || `Image ${images.length + 1}`,
                key: key,
                rowIndex: rowIdx
              });
            }
          });
          return;
        }

        if ((strValue.match(/^https?:\/\/.*\.(mp4|webm|ogg|mov|avi|mkv|flv|wmv|m4v|3gp)/i) && isValidUrl(strValue)) ||
            strValue.match(/^data:video\/[a-zA-Z]+;base64,/)) {
          const urls = splitUrls(strValue);
          urls.forEach(url => {
            if (isValidUrl(url) || url.startsWith('data:video')) {
              videos.push({ 
                uri: url.trim(), 
                name: row.nom || row.name || `Vidéo ${videos.length + 1}`,
                key: key,
                rowIndex: rowIdx,
                isYouTube: false
              });
            }
          });
          return;
        }

        if ((strValue.match(/^https?:\/\/.*\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|csv|json|xml|zip|rar|7z)/i) && isValidUrl(strValue)) ||
            strValue.match(/^data:application\/[a-zA-Z]+;base64,/)) {
          const urls = splitUrls(strValue);
          urls.forEach(url => {
            if (isValidUrl(url) || url.startsWith('data:application')) {
              documents.push({ 
                uri: url.trim(), 
                name: row.nom || row.name || `Document ${documents.length + 1}`,
                key: key,
                rowIndex: rowIdx,
                type: url.match(/\.([^.]+)$/)?.[1] || 'fichier'
              });
            }
          });
          return;
        }

        if (strValue.match(/^https?:\/\/[^\s]+/) && isValidUrl(strValue)) {
          const urls = splitUrls(strValue);
          urls.forEach(url => {
            const trimmedUrl = url.trim();
            if (isValidUrl(trimmedUrl) &&
                !trimmedUrl.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|mp4|webm|ogg|mov|avi|mkv|flv|wmv|m4v|3gp|pdf|doc|docx|xls|xlsx|ppt|pptx|txt|csv|json|xml|zip|rar|7z)/i) &&
                !trimmedUrl.match(/^data:/) &&
                !youtubePattern.test(trimmedUrl)) {
              pages.push({ 
                uri: trimmedUrl, 
                name: row.nom || row.name || `Page ${pages.length + 1}`,
                key: key,
                rowIndex: rowIdx
              });
            }
          });
        }
      });
    });

    return { images, videos, documents, pages, coordinates };
  };

 // ================================================================
// DONNÉES DES GRAPHIQUES (CORRIGÉE)
// ================================================================
const getChartData = (results) => {
  if (!results || results.length === 0) return null;
  const keys = Object.keys(results[0]);
  if (keys.length < 2) return null;
  // 🔥 CORRECTION : Détection améliorée des colonnes
  let labelKey = null;
  let valueKey = null;
  // 1. Identifier la colonne qui semble être une année ou une date
  const datePatterns = ['annee', 'year', 'date', 'mois', 'month', 'jour', 'day', 'trimestre', 'quarter'];
  const numericPatterns = ['nombre', 'count', 'total', 'sum', 'quantite', 'quantity', 'montant', 'amount', 'prix', 'price', 'valeur', 'value'];

  for (const key of keys) {
    const keyLower = key.toLowerCase();
    const val = results[0][key];
    const isNumeric = !isNaN(parseFloat(val)) && isFinite(val);
    const isDateLike = datePatterns.some(pattern => keyLower.includes(pattern));
    const isNumericLike = numericPatterns.some(pattern => keyLower.includes(pattern));
    // Si c'est une année ou une date, c'est le label (abscisse)
    if (isDateLike && !labelKey) {
      labelKey = key;
    }
    // Si c'est un nombre et que ça correspond à un champ numérique typique
    else if (isNumeric && isNumericLike && !valueKey) {
      valueKey = key;
    }
    // Si c'est un nombre mais pas reconnu comme numérique typique
    else if (isNumeric && !valueKey && !labelKey) {
      valueKey = key;
    }
    // Si ce n'est pas un nombre et pas encore de label
    else if (!isNumeric && !labelKey) {
      labelKey = key;
    }
  }
  // 2. Fallback si pas de label trouvé
  if (!labelKey) {
    labelKey = keys.find(k => !isNaN(parseFloat(results[0][k])) === false) || keys[0];
  }
  if (!valueKey) {
    valueKey = keys.find(k => isNaN(parseFloat(results[0][k])) === false) || keys[1];
  }
  // 3. Vérification finale
  if (!valueKey || !labelKey) return null;
  if (isNaN(parseFloat(results[0][valueKey]))) return null;
  // 4. Déterminer si c'est des données brutes (plus de 3 colonnes)
  const isLikelyRawData = keys.length > 3;
  const colors = ['#6c63ff', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6'];
  return {
    labelKey, 
    valueKey, 
    isLikelyRawData,
    data: results.map((row, index) => {
      const numVal = parseFloat(row[valueKey]) || 0;
      const strLabel = String(row[labelKey] || 'N/A').substring(0, 20);
      return {
        value: numVal, 
        label: strLabel, 
        x: strLabel,
        frontColor: colors[index % colors.length],
        color: colors[index % colors.length], 
        text: strLabel
      };
    })
  };
};

  const media = extractMedia(item.results);
  const chartData = item.results ? getChartData(item.results) : null;
  const canRenderChart = !!chartData && item.results.length > 0 && !chartData.isLikelyRawData;

  // ================================================================
  // RENDU DES GRAPHIQUES (simplifié pour la lisibilité)
  // ================================================================
  const renderChart = (isExpanded = false) => {
    const width = isExpanded ? SCREEN_WIDTH - 60 : CHART_WIDTH;
    const height = isExpanded ? 400 : 220;

    if (viewMode === 'bar') {
      return <BarChart data={chartData.data} width={width} height={height} barWidth={isExpanded ? 30 : 24} spacing={isExpanded ? 30 : 24} roundedTop roundedBottom hideRules={false} rulesLength={width - 60} yAxisLabelWidth={isExpanded ? 60 : 45} yAxisTextStyle={[styles.chartAxisText, isExpanded && { fontSize: 12 }]} xAxisLabelTextStyle={[styles.chartAxisText, isExpanded && { fontSize: 12 }]} color="#6c63ff" noOfSections={5} showValuesAsTopLabel topLabelTextStyle={{ fontSize: isExpanded ? 12 : 11, color: '#64748b', fontWeight: 'bold' }} />;
    }
    if (viewMode === 'line') {
      return <LineChart data={chartData.data} width={width} height={height} color="#6c63ff" thickness={isExpanded ? 4 : 3} hideDataPoints={false} dataPointsColor="#fff" dataPointsRadius={isExpanded ? 6 : 5} spacing={isExpanded ? 30 : 24} hideRules={false} rulesLength={width - 60} yAxisLabelWidth={isExpanded ? 60 : 45} yAxisTextStyle={[styles.chartAxisText, isExpanded && { fontSize: 12 }]} xAxisLabelTextStyle={[styles.chartAxisText, isExpanded && { fontSize: 12 }]} areaChart startFillColor="rgba(108, 99, 255, 0.2)" endFillColor="rgba(108, 99, 255, 0.0)" noOfSections={5} isAnimated />;
    }
    if (viewMode === 'pie') {
      return (
        <View style={{ alignItems: 'center' }}>
          <PieChart data={chartData.data} donut innerRadius={isExpanded ? 60 : 40} radius={isExpanded ? 140 : 90} showText textColor="#ffffff" textSize={isExpanded ? 14 : 12} showTextBackground textBackgroundColor="#000000" textBackgroundRadius={isExpanded ? 26 : 22} centerLabelComponent={() => (<View style={styles.pieCenterLabel}><Text style={[styles.pieCenterText, isExpanded && { fontSize: 14 }]}>Total</Text><Text style={[styles.pieCenterValue, isExpanded && { fontSize: 22 }]}>{chartData.data.reduce((sum, item) => sum + item.value, 0).toLocaleString()}</Text></View>)} />
          <View style={[styles.pieLegend, isExpanded && { marginTop: 24 }]}>
            {chartData.data.map((item, idx) => (<View key={idx} style={[styles.legendItem, isExpanded && { width: '33%' }]}><View style={[styles.legendColor, { backgroundColor: item.color }]} /><Text style={[styles.legendText, isExpanded && { fontSize: 13 }]} numberOfLines={1}>{item.text}: {item.value}</Text></View>))}
          </View>
        </View>
      );
    }
    return null;
  };

  // ================================================================
  // RENDU DES MÉDIAS (simplifié)
  // ================================================================
  const renderMediaContent = () => {
    if (viewMode === 'images' && media.images.length > 0) {
      return (
        <ScrollView showsVerticalScrollIndicator={true} style={{ maxHeight: 450 }} nestedScrollEnabled={true}>
          <View style={styles.mediaGrid}>
            {media.images.map((img, idx) => (
              <TouchableOpacity 
                key={idx} 
                style={styles.mediaGridItem}
                onPress={() => {
                  setSelectedMedia(img);
                  setMediaModalVisible(true);
                }}
              >
                <Image source={{ uri: img.uri }} style={styles.mediaGridThumb} resizeMode="cover" onError={() => {}} />
                <Text style={styles.mediaGridLabel} numberOfLines={1}>{img.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      );
    }
    return <View style={styles.noMediaBox}><Text style={styles.noMediaText}>Aucun contenu dans cet onglet</Text></View>;
  };

  // ================================================================
  // ONGLETS DISPONIBLES
  // ================================================================
  const availableTabs = ['cards', 'table'];
  if (media.images.length > 0) availableTabs.push('images');
  if (canRenderChart) {
    availableTabs.push('bar', 'line', 'pie');
  }

  const tabLabels = {
    cards: '📋 Résultats',
    table: '📊 Tableau',
    bar: '📶 Barres',
    line: '📈 Lignes',
    pie: '🥧 Camembert',
    images: '🖼 Images'
  };

  // ================================================================
  // RENDU PRINCIPAL
  // ================================================================
  if (item.error) {
    return (
      <View style={styles.aiRow}>
        <View style={styles.aiIcon}><Text style={styles.aiIconText}>E</Text></View>
        <View style={styles.aiContent}>
          <View style={styles.errorBox}><Text style={styles.errorText}>⚠️ {item.error}</Text></View>
          {item.sql && <View style={styles.sqlBlockError}><Text style={styles.sqlTextError} selectable>{item.sql}</Text></View>}
        </View>
      </View>
    );
  }

  if (item.content) {
    if (item.isAlert) {
      return (
        <View style={styles.aiRow}>
          <View style={[styles.aiIcon, { backgroundColor: '#ef4444' }]}><Text style={styles.aiIconText}>🚨</Text></View>
          <View style={[styles.aiContent, { backgroundColor: '#fef2f2', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#fecaca' }]}>
            <Text style={{ fontSize: 14, color: '#b91c1c', lineHeight: 20 }} selectable>{item.content}</Text>
          </View>
        </View>
      );
    }
    return (
      <View style={styles.aiRow}>
        <View style={styles.aiIcon}><Text style={styles.aiIconText}>E</Text></View>
        <View style={[styles.aiContent, { backgroundColor: '#f8fafc', padding: 12, borderRadius: 12 }]}>
          <Text style={{ fontSize: 14, color: '#1e293b', lineHeight: 20 }} selectable>{item.content}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.aiRow}>
      <View style={styles.aiIcon}><Text style={styles.aiIconText}>E</Text></View>
      <View style={styles.aiContent}>
        {item.results && item.results.length > 0 ? (
          <View style={styles.resultsContainer}>
            <View style={styles.resultsHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                {item.isIndicator && <Text style={{ marginRight: 6 }}>📊</Text>}
                <Text style={styles.resultsTitle} numberOfLines={1}>
                  {item.isIndicator ? `Indicateur : ${item.nom || 'Résultat'}` : '📊 Résultats'}
                </Text>
              </View>
              <View style={styles.resultsCountBadge}><Text style={styles.resultsCount}>{item.count || item.results.length} ligne(s)</Text></View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chartTabsScroll}>
              <View style={styles.chartTabs}>
                {availableTabs.map((mode) => (
                  <TouchableOpacity
                    key={mode}
                    style={[styles.chartTab, viewMode === mode && styles.chartTabActive]}
                    onPress={() => setViewMode(mode)}
                  >
                    <Text style={[styles.chartTabText, viewMode === mode && styles.chartTabTextActive]}>
                      {tabLabels[mode] || mode}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.resultsContent}>
              {viewMode === 'cards' && (
                <ScrollView showsVerticalScrollIndicator style={{ maxHeight: 400 }}>
                  {item.results.map((row, idx) => (
                    <View key={idx} style={styles.resultCard}>
                      <View style={styles.resultCardHeader}>
                        <Text style={styles.resultCardIndex}>#{idx + 1}</Text>
                      </View>
                      {Object.entries(row).map(([key, value], i) => (
                        <View key={i} style={styles.resultRow}>
                          <Text style={styles.resultLabel} numberOfLines={1}>{key}</Text>
                          <Text style={styles.resultValue} selectable>{value === null || value === undefined ? 'NULL' : String(value)}</Text>
                        </View>
                      ))}
                    </View>
                  ))}
                </ScrollView>
              )}

              {viewMode === 'table' && item.results.length > 0 && (
                <ScrollView style={styles.tableWrapper} showsVerticalScrollIndicator={true} nestedScrollEnabled>
                  <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                    <View style={{ minWidth: '100%' }}>
                      <View style={styles.tableHeader}>
                        <View style={[styles.tableCell, styles.tableCellHeader, { width: 40 }]}>
                          <Text style={styles.tableHeaderText}>#</Text>
                        </View>
                        {Object.keys(item.results[0]).map((key, idx) => (
                          <View key={idx} style={[styles.tableCell, styles.tableCellHeader, { minWidth: 120 }]}>
                            <Text style={styles.tableHeaderText} numberOfLines={1}>{key}</Text>
                          </View>
                        ))}
                      </View>

                      {item.results.slice(0, displayLimit).map((row, rowIndex) => (
                        <View key={rowIndex} style={[styles.tableRow, rowIndex % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd]}>
                          <View style={[styles.tableCell, { width: 40, justifyContent: 'center' }]}>
                            <Text style={styles.tableCellText}>{rowIndex + 1}</Text>
                          </View>
                          {Object.values(row).map((value, colIndex) => (
                            <View key={colIndex} style={[styles.tableCell, { minWidth: 120, justifyContent: 'center' }]}>
                              <Text style={styles.tableCellText} numberOfLines={2}>
                                {value === null || value === undefined ? 'NULL' : String(value)}
                              </Text>
                            </View>
                          ))}
                        </View>
                      ))}
                      
                      {displayLimit < item.results.length && (
                        <TouchableOpacity onPress={() => setDisplayLimit(displayLimit + 50)} style={styles.seeMoreButton}>
                          <Text style={styles.seeMoreText}>Voir plus ({item.results.length - displayLimit} lignes restantes)</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </ScrollView>
                </ScrollView>
              )}

              {canRenderChart && (viewMode === 'bar' || viewMode === 'line' || viewMode === 'pie') && (
                <TouchableOpacity activeOpacity={0.8} onPress={() => setIsChartExpanded(true)} style={styles.chartContainer}>
                  {renderChart(false)}
                  <View style={styles.zoomHint}><Text style={styles.zoomHintText}>🔍 Cliquer pour agrandir</Text></View>
                </TouchableOpacity>
              )}

              {viewMode === 'images' && renderMediaContent()}
            </View>
          </View>
        ) : (
          <View style={styles.noResultBox}><Text style={styles.aiText}>✅ Requête exécutée avec succès, mais aucun résultat trouvé.</Text></View>
        )}

        {item.sql && (
          <View style={styles.sqlActions}>
            <TouchableOpacity style={styles.sqlToggle} onPress={() => setShowSql(!showSql)}>
              <Text style={styles.sqlToggleText}>🔎 {showSql ? 'Masquer le SQL' : 'Voir le SQL généré'}</Text>
            </TouchableOpacity>
            {!item.isIndicator && (
              <TouchableOpacity style={styles.saveIndicatorButton} onPress={() => onSaveIndicator(item.sql)}>
                <Text style={styles.saveIndicatorButtonText}>💾 Sauvegarder</Text>
              </TouchableOpacity>
            )}
            {showSql && <View style={styles.sqlBlock}><Text style={styles.sqlText} selectable>{item.sql}</Text></View>}
          </View>
        )}
      </View>

      {/* MODAL POUR LES IMAGES EN PLEIN ÉCRAN */}
      <Modal visible={mediaModalVisible} transparent animationType="fade" onRequestClose={() => setMediaModalVisible(false)}>
        <View style={styles.mediaModalOverlay}>
          <TouchableOpacity style={styles.mediaModalClose} onPress={() => setMediaModalVisible(false)}>
            <Text style={styles.mediaModalCloseText}>✕</Text>
          </TouchableOpacity>
          {selectedMedia && (
            <View style={styles.mediaModalContent}>
              <Text style={styles.mediaModalTitle}>{selectedMedia.name}</Text>
              {selectedMedia.uri && (
                <Image source={{ uri: selectedMedia.uri }} style={styles.mediaModalImage} resizeMode="contain" />
              )}
            </View>
          )}
        </View>
      </Modal>

      {/* MODAL POUR LES GRAPHIQUES AGRANDIS */}
      <Modal visible={isChartExpanded} transparent animationType="fade" onRequestClose={() => setIsChartExpanded(false)}>
        <View style={styles.expandedChartOverlay}>
          <View style={styles.expandedChartContainer}>
            <View style={styles.expandedChartHeader}>
              <Text style={styles.expandedChartTitle}>
                {viewMode === 'bar' ? '📶 Graphique en Barres' : 
                 viewMode === 'line' ? '📈 Graphique en Lignes' : 
                 viewMode === 'pie' ? '🥧 Graphique en Camembert' : '📊 Graphique'}
              </Text>
              <TouchableOpacity onPress={() => setIsChartExpanded(false)} style={styles.closeExpandedButton}>
                <Text style={styles.closeExpandedText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.expandedChartScroll} showsVerticalScrollIndicator>
              {renderChart(true)}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
});

// ================================================================
// STYLES
// ================================================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  loginContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  loginIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#6c63ff', justifyContent: 'center', alignItems: 'center', marginBottom: 20, shadowColor: '#6c63ff', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6 },
  loginIconText: { color: 'white', fontSize: 36, fontWeight: 'bold' },
  loginTitle: { fontSize: 28, fontWeight: '800', color: '#1a1a2e', marginBottom: 8 },
  loginSubtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 32, lineHeight: 20 },
  loginForm: { width: '100%' },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 14, paddingHorizontal: 14 },
  inputIcon: { fontSize: 18, marginRight: 10 },
  loginInput: { flex: 1, paddingVertical: 14, fontSize: 16, color: '#1e293b' },
  eyeButton: { padding: 6 },
  eyeText: { fontSize: 18 },
  loginButton: { backgroundColor: '#6c63ff', borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
  loginButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  forgotButton: { alignItems: 'center', paddingVertical: 14, marginTop: 4 },
  forgotButtonText: { fontSize: 14, color: '#6c63ff', fontWeight: '600' },
  loginFooter: { marginTop: 24, fontSize: 12, color: '#94a3b8', textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  modalContainer: { backgroundColor: '#ffffff', borderRadius: 20, padding: 28, width: '100%', maxWidth: 380, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 30, elevation: 10 },
  modalHeader: { alignItems: 'center', marginBottom: 24 },
  modalIconWrapper: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#ede9fe', justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  modalIcon: { fontSize: 26 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1a1a2e', marginBottom: 6, textAlign: 'center' },
  modalSubtitle: { fontSize: 13, color: '#6b7280', textAlign: 'center', lineHeight: 18 },
  modalBody: { width: '100%' },
  resetInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 14, marginBottom: 14 },
  resetInputIcon: { fontSize: 18, marginRight: 10 },
  resetInput: { flex: 1, paddingVertical: 14, fontSize: 15, color: '#1e293b' },
  resetErrorBox: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 10, padding: 12, marginBottom: 14 },
  resetErrorText: { fontSize: 13, color: '#b91c1c', lineHeight: 18 },
  resetButton: { backgroundColor: '#6c63ff', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  resetButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  resetSuccessBox: { alignItems: 'center', paddingVertical: 10 },
  resetSuccessIcon: { fontSize: 40, marginBottom: 12 },
  resetSuccessText: { fontSize: 15, color: '#166534', textAlign: 'center', lineHeight: 22, fontWeight: '600', marginBottom: 8 },
  resetSuccessHint: { fontSize: 12, color: '#6b7280', textAlign: 'center', lineHeight: 17 },
  modalCloseButton: { marginTop: 20, paddingVertical: 12, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  modalCloseText: { fontSize: 14, color: '#64748b', fontWeight: '600' },
  header: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', backgroundColor: '#ffffff' },
  headerLeft: { flex: 1 },
  headerUser: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  brand: { fontSize: 12, fontWeight: '800', color: '#6c63ff' },
  backButton: { paddingVertical: 6, paddingHorizontal: 10, backgroundColor: '#f1f5f9', borderRadius: 8 },
  backText: { fontSize: 13, color: '#6c63ff', fontWeight: '600' },
  logoutButton: { paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#fef2f2', borderRadius: 8 },
  logoutText: { fontSize: 12, color: '#ef4444', fontWeight: '600' },
  logoutButtonSmall: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fef2f2', justifyContent: 'center', alignItems: 'center', marginLeft: 4 },
  logoutTextSmall: { fontSize: 16 },
  basesContainer: { flex: 1, paddingHorizontal: 16, paddingTop: 20 },
  basesTitle: { fontSize: 20, fontWeight: '700', color: '#1a1a2e', marginBottom: 4 },
  basesSubtitle: { fontSize: 13, color: '#6b7280', marginBottom: 16 },
  noBasesText: { fontSize: 15, color: '#6b7280', textAlign: 'center', marginTop: 12, lineHeight: 22 },
  loadingCenter: { alignItems: 'center', marginTop: 60 },
  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  refreshButton: { marginTop: 16, backgroundColor: '#f1f5f9', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  refreshButtonText: { fontSize: 14, color: '#6c63ff', fontWeight: '600' },
  baseCard: { backgroundColor: '#f8fafc', borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#e5e7eb' },
  baseCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  baseIconWrapper: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#ede9fe', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  baseIconText: { fontSize: 20 },
  baseInfo: { flex: 1 },
  baseName: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  baseHost: { fontSize: 12, color: '#64748b', marginTop: 2 },
  baseStatusBadge: { backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  baseStatusText: { fontSize: 11, color: '#16a34a', fontWeight: '600' },
  baseTablesSection: { backgroundColor: '#ffffff', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#f1f5f9' },
  baseTablesLabel: { fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 4 },
  baseTables: { fontSize: 12, color: '#6c63ff', fontStyle: 'italic', lineHeight: 18 },
  baseTablesAll: { fontSize: 12, color: '#16a34a', fontWeight: '600', fontStyle: 'italic' },
  baseCardFooter: { marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#e5e7eb', alignItems: 'flex-end' },
  baseAction: { fontSize: 13, color: '#6c63ff', fontWeight: '700' },
  chatArea: { flex: 1, backgroundColor: '#ffffff' },
  listContent: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 20, flexGrow: 1 },
  welcome: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  welcomeIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#6c63ff', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  welcomeIconText: { color: 'white', fontSize: 26, fontWeight: 'bold' },
  welcomeTitle: { fontSize: 20, fontWeight: '700', color: '#1a1a2e', marginBottom: 8, textAlign: 'center' },
  welcomeText: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20, marginBottom: 16 },
  welcomeTables: { backgroundColor: '#f8fafc', borderRadius: 10, padding: 12, width: '100%', borderWidth: 1, borderColor: '#e5e7eb' },
  welcomeTablesTitle: { fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 4 },
  welcomeTablesList: { fontSize: 12, color: '#6c63ff', lineHeight: 18 },
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
  sqlTextError: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 11, color: '#fca5a5', lineHeight: 16 },
  noResultBox: { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 12, padding: 12 },
  aiText: { fontSize: 14, color: '#166534', lineHeight: 20 },
  resultsContainer: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, overflow: 'hidden', backgroundColor: '#ffffff' },
  resultsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11, backgroundColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  resultsTitle: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  resultsCountBadge: { backgroundColor: '#ede9fe', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  resultsCount: { fontSize: 11, color: '#6c63ff', fontWeight: '600' },
  resultCard: { paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  resultCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  resultCardIndex: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
  resultRow: { flexDirection: 'row', marginBottom: 5, alignItems: 'flex-start' },
  resultLabel: { fontSize: 12, fontWeight: '600', color: '#64748b', width: 100, marginRight: 8 },
  resultValue: { fontSize: 13, color: '#1e293b', flex: 1, flexWrap: 'wrap' },
  resultsFooter: { padding: 10, backgroundColor: '#f8fafc', alignItems: 'center' },
  resultsFooterText: { fontSize: 11, color: '#64748b' },
  sqlToggle: { marginTop: 10, paddingVertical: 6 },
  sqlToggleText: { color: '#6c63ff', fontSize: 13, fontWeight: '600' },
  sqlBlock: { backgroundColor: '#0f172a', borderRadius: 10, padding: 12, marginTop: 6 },
  sqlText: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 12, color: '#a5f3fc', lineHeight: 18 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, marginHorizontal: 14, marginBottom: 8, backgroundColor: '#f8fafc', borderRadius: 12 },
  loadingText: { marginLeft: 10, color: '#64748b', fontSize: 13 },
  speakingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 16, marginHorizontal: 14, marginBottom: 8, backgroundColor: '#ede9fe', borderRadius: 12 },
  speakingText: { color: '#6c63ff', fontSize: 13, fontWeight: '600' },
  stopText: { color: '#ef4444', fontSize: 13, fontWeight: '700' },
  inputArea: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: Platform.OS === 'ios' ? 12 : 18, borderTopWidth: 1, borderTopColor: '#e5e7eb', backgroundColor: '#ffffff' },
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
  sidebarContainer: { width: '85%', maxWidth: 320, height: '100%', backgroundColor: '#ffffff', borderTopRightRadius: 20, borderBottomRightRadius: 20, paddingTop: 50, paddingHorizontal: 16 },
  sidebarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  sidebarTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a2e' },
  sidebarClose: { fontSize: 22, color: '#64748b', padding: 4 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 10, paddingHorizontal: 12, marginBottom: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: '#1e293b' },
  indicatorItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 10, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#e5e7eb' },
  indicatorContent: { flex: 1, paddingRight: 8 },
  indicatorName: { fontSize: 15, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
  indicatorDesc: { fontSize: 12, color: '#64748b', marginBottom: 6, lineHeight: 16 },
  deleteIndicatorButton: { padding: 6, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fef2f2', borderRadius: 8, borderWidth: 1, borderColor: '#fecaca', marginLeft: 4 },
  deleteIndicatorIcon: { fontSize: 16 },
  emptySidebarText: { textAlign: 'center', color: '#94a3b8', fontSize: 14, marginTop: 40 },
  sqlActions: { marginTop: 10 },
  saveIndicatorButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, marginTop: 8, alignSelf: 'flex-start' },
  saveIndicatorButtonText: { fontSize: 13, color: '#166534', fontWeight: '600' },
  sqlPreviewBox: { backgroundColor: '#0f172a', borderRadius: 10, padding: 12, marginTop: 4 },
  sqlPreviewLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '600', marginBottom: 6, textTransform: 'uppercase' },
  sqlPreviewText: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 11, color: '#a5f3fc', lineHeight: 16 },
  alertItem: { padding: 12, borderRadius: 10, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: '#ef4444', backgroundColor: '#fef2f2' },
  alertIndicatorName: { fontWeight: '600', color: '#1e293b' },
  alertIndicatorValue: { fontSize: 18, fontWeight: '700', color: '#ef4444' },
  alertIndicatorThreshold: { fontSize: 12, color: '#64748b' },
  chartTabsScroll: { marginHorizontal: 14, marginTop: 12, marginBottom: 8 },
  chartTabs: { flexDirection: 'row', backgroundColor: '#f1f5f9', padding: 4, borderRadius: 8, gap: 4 },
  chartTab: { paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center', borderRadius: 6, minWidth: 70 },
  chartTabActive: { backgroundColor: '#ffffff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  chartTabText: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  chartTabTextActive: { color: '#6c63ff' },
  chartContainer: { padding: 16, alignItems: 'center', justifyContent: 'center', minHeight: 220 },
  chartAxisText: { fontSize: 10, color: '#94a3b8' },
  chartWarning: { padding: 16, backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fcd34d', borderRadius: 8, margin: 14 },
  chartWarningText: { fontSize: 12, color: '#92400e', textAlign: 'center', lineHeight: 18 },
  pieCenterLabel: { justifyContent: 'center', alignItems: 'center' },
  pieCenterText: { fontSize: 12, color: '#64748b' },
  pieCenterValue: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  pieLegend: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 16, paddingHorizontal: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', width: '50%', marginBottom: 8 },
  legendColor: { width: 12, height: 12, borderRadius: 6, marginRight: 8 },
  legendText: { fontSize: 12, color: '#475569', flex: 1 },
  zoomHint: { marginTop: 8, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#f1f5f9', borderRadius: 20, alignSelf: 'center' },
  zoomHintText: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  expandedChartOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  expandedChartContainer: { backgroundColor: '#ffffff', borderRadius: 20, width: '100%', maxHeight: '90%', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10, overflow: 'hidden' },
  expandedChartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', backgroundColor: '#f8fafc' },
  expandedChartTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', flex: 1 },
  closeExpandedButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fef2f2', justifyContent: 'center', alignItems: 'center' },
  closeExpandedText: { fontSize: 18, color: '#ef4444', fontWeight: 'bold' },
  expandedChartScroll: { padding: 20, alignItems: 'center', paddingBottom: 40 },

  // ===== STYLES POUR LE TABLEAU =====
  tableWrapper: {maxHeight: 350,borderWidth: 1,borderColor: '#e5e7eb',borderRadius: 8,},
  tableHeader: {flexDirection: 'row',backgroundColor: '#6c63ff',borderRadius: 8,marginBottom: 4,paddingVertical: 4,},
  tableRow: {flexDirection: 'row',borderRadius: 4,paddingVertical: 2,minHeight: 36,},
  tableRowEven: {backgroundColor: '#f8fafc',},
  tableRowOdd: {backgroundColor: '#ffffff',},
  tableCell: {paddingHorizontal: 8,paddingVertical: 6,borderRightWidth: 0.5,borderRightColor: '#e5e7eb',},
  tableCellHeader: {borderRightColor: 'rgba(255,255,255,0.2)',},
  tableHeaderText: {fontSize: 12,fontWeight: '700',color: '#ffffff',textAlign: 'left',},
  tableCellText: {fontSize: 12,color: '#1e293b',},
  resultsContent: {flex: 1,minHeight: 200,maxHeight: 500,},
  seeMoreButton: {padding: 12,alignItems: 'center',backgroundColor: '#f0f9ff',borderTopWidth: 1,borderTopColor: '#e5e7eb',},
  seeMoreText: {color: '#6c63ff',fontSize: 13,fontWeight: '600',},

  // ===== STYLES POUR LES MÉDIAS =====
  mediaCard: {backgroundColor: '#f8fafc', borderRadius: 12,padding: 14,marginBottom: 10,borderWidth: 1,borderColor: '#e5e7eb',},
  mediaCardTitle: {fontSize: 14,fontWeight: '700',color: '#1e293b',marginBottom: 4,},
  mediaCardSub: {fontSize: 12,color: '#64748b',marginBottom: 8,},
  mediaButton: {backgroundColor: '#6c63ff',paddingVertical: 10,paddingHorizontal: 16,borderRadius: 8,alignItems: 'center',},
  mediaButtonText: {color: '#ffffff',fontSize: 13,fontWeight: '600',},
  mediaGrid: {flexDirection: 'row',flexWrap: 'wrap',padding: 8,justifyContent: 'space-between',},
  mediaGridItem: {width: '48%',marginBottom: 12,borderRadius: 12,overflow: 'hidden',backgroundColor: '#f1f5f9',borderWidth: 1,borderColor: '#e5e7eb',},
  mediaGridThumb: {width: '100%',height: 120,},
  mediaGridLabel: {fontSize: 12,color: '#475569',padding: 8,fontWeight: '500',},
  noMediaBox: {padding: 40,alignItems: 'center',},
  noMediaText: {fontSize: 14,color: '#94a3b8',textAlign: 'center',},
  mediaModalOverlay: {flex: 1,backgroundColor: 'rgba(0,0,0,0.95)',justifyContent: 'center',alignItems: 'center',padding: 20,},
  mediaModalClose: {position: 'absolute',top: 50,right: 20,zIndex: 10,width: 44,height: 44,borderRadius: 22,backgroundColor: 'rgba(255,255,255,0.2)',justifyContent: 'center',alignItems: 'center',},
  mediaModalCloseText: {color: '#fff',fontSize: 24,fontWeight: 'bold',},
  mediaModalContent: {width: '100%',maxHeight: '80%',alignItems: 'center',},
  mediaModalTitle: {color: '#ffffff',fontSize: 16,fontWeight: '700',marginBottom: 12,textAlign: 'center',},
  mediaModalImage: {width: '100%',height: 400,borderRadius: 8,},
  mediaModalVideoContainer: {width: '100%',height: 300,backgroundColor: '#1a1a2e',borderRadius: 8,justifyContent: 'center',alignItems: 'center',padding: 20,},
  mediaModalVideoPlaceholder: {color: '#ffffff',fontSize: 24,marginBottom: 12,},
  mediaModalVideoUrl: {color: '#94a3b8',fontSize: 12,textAlign: 'center',},
  
  // ===== STYLES POUR LA SURVEILLANCE =====
  monitoringContainer: { flex: 1, padding: 16, backgroundColor: '#0a0a1a' },
  monitoringHeader: { marginBottom: 20 },
  monitoringTitle: { fontSize: 22, fontWeight: '700', color: '#ffffff', marginBottom: 4 },
  monitoringSubtitle: { fontSize: 14, color: '#94a3b8' },
  monitoringStatus: { fontSize: 13, fontWeight: '600', marginTop: 4 },
  monitoringControls: { flexDirection: 'row', gap: 12, marginBottom: 20, flexWrap: 'wrap' },
  monitoringButton: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, alignItems: 'center', minWidth: 120, flex: 1 },
  monitoringButtonStart: { backgroundColor: '#22c55e' },
  monitoringButtonStop: { backgroundColor: '#ef4444' },
  monitoringButtonText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  monitoringStatsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  monitoringStatCard: { flex: 1, minWidth: '45%', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  monitoringStatLabel: { fontSize: 12, color: '#94a3b8', marginBottom: 4 },
  monitoringStatValue: { fontSize: 20, fontWeight: '700', color: '#ffffff' },
  monitoringAlerts: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 16, marginBottom: 16 },
  monitoringAlertsTitle: { fontSize: 16, fontWeight: '600', color: '#ef4444', marginBottom: 10 },
  monitoringAlertItem: { paddingVertical: 10, paddingHorizontal: 12, borderLeftWidth: 3, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 6, marginBottom: 6 },
  monitoringAlertText: { fontSize: 13, color: '#e2e8f0' },
  monitoringTables: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 16, flex: 1 },
  monitoringTablesTitle: { fontSize: 16, fontWeight: '600', color: '#ffffff', marginBottom: 10 },
  monitoringTableItem: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  monitoringTableHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  monitoringTableName: { fontSize: 13, color: '#e2e8f0', fontWeight: '500' },
  monitoringTableRows: { fontSize: 12, color: '#94a3b8' },
  monitoringTableDetails: { flexDirection: 'row', gap: 16, marginTop: 4 },
  monitoringTableDetail: { fontSize: 11, color: '#64748b' },
  monitoringStatusText:{color:'white'}
});
