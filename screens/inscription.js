// inscription.js - Création de compte utilisateur
// Design mode jour comme Eric IA

import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, Modal, TextInput,
  ScrollView, ActivityIndicator, Alert, StyleSheet,
  Dimensions, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Speech from 'expo-speech';

const API_URL = 'https://cyberic.xyz/api/ia-inscription.php';
const SCREEN_WIDTH = Dimensions.get('window').width;

export default function Inscription({ onClose, visible, onSuccess }) {
  
  // ===== ÉTATS =====
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // ===== FORMULAIRE =====
  const [formData, setFormData] = useState({
    nom_prenom: '',
    telephone: '',
    email: '',
    login: '',
    mot_passe: '',
    confirm_password: ''
  });

  // ===== RÉFÉRENCES =====
  const nomRef = useRef(null);
  const telephoneRef = useRef(null);
  const emailRef = useRef(null);
  const loginRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmRef = useRef(null);

  // ================================================================
  // FONCTIONS VOCALES
  // ================================================================
  const speak = (text) => {
    if (!text) return;
    const cleanText = text.replace(/[*#_`]/g, '').substring(0, 4000);
    Speech.stop();
    Speech.speak(cleanText, {
      language: 'fr-FR',
      rate: 1.0,
      pitch: 1.0,
    });
  };

  // ================================================================
  // VALIDATION
  // ================================================================
  const validateForm = () => {
    // Nom complet
    if (!formData.nom_prenom.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir votre nom et prénom.');
      nomRef.current?.focus();
      return false;
    }
    
    // Téléphone
    const phoneRegex = /^[0-9]{8,15}$/;
    if (!formData.telephone.trim() || !phoneRegex.test(formData.telephone.trim())) {
      Alert.alert('Erreur', 'Veuillez saisir un numéro de téléphone valide (8 à 15 chiffres).');
      telephoneRef.current?.focus();
      return false;
    }
    
    // Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim() || !emailRegex.test(formData.email.trim())) {
      Alert.alert('Erreur', 'Veuillez saisir une adresse email valide.');
      emailRef.current?.focus();
      return false;
    }
    
    // Login
    if (!formData.login.trim() || formData.login.length < 3) {
      Alert.alert('Erreur', 'Le login doit contenir au moins 3 caractères.');
      loginRef.current?.focus();
      return false;
    }
    
    // Mot de passe
    if (!formData.mot_passe || formData.mot_passe.length < 6) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 6 caractères.');
      passwordRef.current?.focus();
      return false;
    }
    
    // Confirmation du mot de passe
    if (formData.mot_passe !== formData.confirm_password) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas.');
      confirmRef.current?.focus();
      return false;
    }
    
    return true;
  };

  // ================================================================
  // INSCRIPTION
  // ================================================================
  const handleInscription = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const payload = {
        action: 'register',
        nom_prenom: formData.nom_prenom.trim(),
        telephone: formData.telephone.trim(),
        email: formData.email.trim().toLowerCase(),
        login: formData.login.trim().toLowerCase(),
        mot_passe: formData.mot_passe
      };
      
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      
      if (data.success) {
        Alert.alert(
          '✅ Inscription réussie !',
          `Bienvenue ${formData.nom_prenom} !\n\nVotre compte a été créé avec succès.\nVous pouvez maintenant vous connecter.`,
          [
            { 
              text: 'Se connecter', 
              onPress: () => {
                speak('Inscription réussie. Bienvenue !');
                if (onSuccess) {
                  onSuccess(formData.login);
                }
                handleClose();
              }
            }
          ]
        );
      } else {
        Alert.alert('Erreur', data.error || 'Impossible de créer le compte.');
        speak('Erreur lors de l\'inscription.');
      }
    } catch (e) {
      Alert.alert('Erreur réseau', 'Impossible de communiquer avec le serveur.');
      console.error('Erreur inscription:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // ================================================================
  // FERMETURE
  // ================================================================
  const handleClose = () => {
    setFormData({
      nom_prenom: '',
      telephone: '',
      email: '',
      login: '',
      mot_passe: '',
      confirm_password: ''
    });
    setShowPassword(false);
    setShowConfirmPassword(false);
    onClose();
  };

  // ================================================================
  // RENDU
  // ================================================================
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <SafeAreaView style={styles.mainContainer} edges={["top", "bottom"]}>
        <KeyboardAvoidingView 
          style={styles.keyboardView} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView 
            style={styles.scrollView} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.container}>
              {/* Header */}
              <View style={styles.header}>
                <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
                <View style={styles.headerIcon}>
                  <Text style={styles.headerIconText}>👤</Text>
                </View>
                <Text style={styles.headerTitle}>Créer un compte</Text>
                <Text style={styles.headerSubtitle}>Inscrivez-vous pour accéder à vos bases</Text>
              </View>

              {/* Formulaire */}
              <View style={styles.formContainer}>
                {/* Nom complet */}
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputIcon}>👤</Text>
                  <TextInput
                    ref={nomRef}
                    style={styles.input}
                    placeholder="Nom et prénom *"
                    placeholderTextColor="#94a3b8"
                    value={formData.nom_prenom}
                    onChangeText={(text) => setFormData({...formData, nom_prenom: text})}
                    autoCapitalize="words"
                    returnKeyType="next"
                    onSubmitEditing={() => telephoneRef.current?.focus()}
                  />
                </View>

                {/* Téléphone */}
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputIcon}>📱</Text>
                  <TextInput
                    ref={telephoneRef}
                    style={styles.input}
                    placeholder="Téléphone *"
                    placeholderTextColor="#94a3b8"
                    value={formData.telephone}
                    onChangeText={(text) => setFormData({...formData, telephone: text.replace(/[^0-9]/g, '')})}
                    keyboardType="phone-pad"
                    returnKeyType="next"
                    onSubmitEditing={() => emailRef.current?.focus()}
                    maxLength={15}
                  />
                </View>

                {/* Email */}
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputIcon}>📧</Text>
                  <TextInput
                    ref={emailRef}
                    style={styles.input}
                    placeholder="Email *"
                    placeholderTextColor="#94a3b8"
                    value={formData.email}
                    onChangeText={(text) => setFormData({...formData, email: text})}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    returnKeyType="next"
                    onSubmitEditing={() => loginRef.current?.focus()}
                  />
                </View>

                {/* Login */}
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputIcon}>🔑</Text>
                  <TextInput
                    ref={loginRef}
                    style={styles.input}
                    placeholder="Nom d'utilisateur *"
                    placeholderTextColor="#94a3b8"
                    value={formData.login}
                    onChangeText={(text) => setFormData({...formData, login: text})}
                    autoCapitalize="none"
                    returnKeyType="next"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                  />
                </View>

                {/* Mot de passe */}
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputIcon}>🔒</Text>
                  <TextInput
                    ref={passwordRef}
                    style={[styles.input, { flex: 1 }]}
                    placeholder="Mot de passe (6 caractères min) *"
                    placeholderTextColor="#94a3b8"
                    value={formData.mot_passe}
                    onChangeText={(text) => setFormData({...formData, mot_passe: text})}
                    secureTextEntry={!showPassword}
                    returnKeyType="next"
                    onSubmitEditing={() => confirmRef.current?.focus()}
                  />
                  <TouchableOpacity 
                    onPress={() => setShowPassword(!showPassword)} 
                    style={styles.eyeButton}
                  >
                    <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁️'}</Text>
                  </TouchableOpacity>
                </View>

                {/* Confirmation mot de passe */}
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputIcon}>✓</Text>
                  <TextInput
                    ref={confirmRef}
                    style={[styles.input, { flex: 1 }]}
                    placeholder="Confirmer le mot de passe *"
                    placeholderTextColor="#94a3b8"
                    value={formData.confirm_password}
                    onChangeText={(text) => setFormData({...formData, confirm_password: text})}
                    secureTextEntry={!showConfirmPassword}
                    returnKeyType="done"
                    onSubmitEditing={handleInscription}
                  />
                  <TouchableOpacity 
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)} 
                    style={styles.eyeButton}
                  >
                    <Text style={styles.eyeText}>{showConfirmPassword ? '🙈' : '👁️'}</Text>
                  </TouchableOpacity>
                </View>

                {/* Informations */}
                <View style={styles.infoBox}>
                  <Text style={styles.infoText}>
                    🔒 Tous les champs marqués d'un * sont obligatoires et 
                    le compte sera activé automatiquement
                  </Text>
                </View>

                {/* Bouton d'inscription */}
                <TouchableOpacity 
                  style={[styles.submitButton, isLoading && { opacity: 0.6 }]} 
                  onPress={handleInscription} 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.submitButtonText}>✅ Créer mon compte</Text>
                  )}
                </TouchableOpacity>

                {/* Lien vers connexion */}
                <TouchableOpacity 
                  style={styles.loginLink}
                  onPress={() => {
                    handleClose();
                    // Optionnel : ouvrir le modal de connexion
                  }}
                >
                  <Text style={styles.loginLinkText}>
                    Déjà un compte ? <Text style={styles.loginLinkHighlight}>Se connecter</Text>
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Footer */}
              <View style={styles.footer}>
                <Text style={styles.footerText}>
                  🔐 Création de compte sécurisée
                </Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// ================================================================
// STYLES
// ================================================================
const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  keyboardView: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingVertical: 20 },
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    marginHorizontal: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 30,
    elevation: 10,
    maxWidth: 420,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  closeButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#ef4444',
    fontWeight: 'bold',
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ede9fe',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerIconText: {
    fontSize: 32,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 18,
  },
  formContainer: {
    width: '100%',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  inputIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1e293b',
  },
  eyeButton: {
    padding: 6,
  },
  eyeText: {
    fontSize: 18,
  },
  infoBox: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 12,
    color: '#166534',
    lineHeight: 20,
  },
  submitButton: {
    backgroundColor: '#6c63ff',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  loginLink: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 4,
  },
  loginLinkText: {
    fontSize: 14,
    color: '#6b7280',
  },
  loginLinkHighlight: {
    color: '#6c63ff',
    fontWeight: '600',
  },
  footer: {
    marginTop: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 16,
  },
  footerText: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
  },
});