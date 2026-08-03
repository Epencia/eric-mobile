// gestionnaire.js - Gestionnaire de bases de données
// Design mode jour comme Eric IA

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, Modal, FlatList, TextInput,
  ScrollView, ActivityIndicator, Alert, RefreshControl, StyleSheet,
  Dimensions, StatusBar, KeyboardAvoidingView, Platform, Switch
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Speech from 'expo-speech';

const API_URL = 'https://cyberic.xyz/api/ia-gestionnaire.php';
const SCREEN_WIDTH = Dimensions.get('window').width;

export default function Gestionnaire({ user, onClose, visible }) {
  
  // ===== ÉTATS =====
  const [bases, setBases] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBase, setSelectedBase] = useState(null);
  
  // États pour les modals
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [baseToDelete, setBaseToDelete] = useState(null);
  
  // États pour le formulaire d'ajout
  const [formData, setFormData] = useState({
    base_id: '',
    hote: '',
    nom_base: '',
    utilisateur: '',
    mot_passe: '',
    bridge_url: '',
    bridge_token: '',
    mode_connexion: 'direct', // 'direct' ou 'bridge'
    api_key: '',
    url: '',
    tables: '',
    statut: 'actif'
  });
  
  // États pour le formulaire d'édition
  const [editFormData, setEditFormData] = useState({
    base_id: '',
    hote: '',
    nom_base: '',
    utilisateur: '',
    mot_passe: '',
    bridge_url: '',
    bridge_token: '',
    mode_connexion: 'direct',
    api_key: '',
    url: '',
    tables: '',
    statut: 'actif'
  });
  
  // États pour les filtres
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState('all'); // 'all', 'direct', 'bridge'
  const [filterStatut, setFilterStatut] = useState('all'); // 'all', 'actif', 'inactif'
  
  // États vocaux
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);

  // ================================================================
  // FONCTIONS VOCALES
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

  // ================================================================
  // CHARGEMENT DES DONNÉES
  // ================================================================
  useEffect(() => {
    if (visible) {
      loadBases();
    }
  }, [visible]);

  const loadBases = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_bases',
          user_id: user.id
        })
      });
      const data = await res.json();
      if (data.success) {
        setBases(data.bases || []);
      } else {
        Alert.alert('Erreur', data.error || 'Impossible de charger les bases');
      }
    } catch (e) {
      Alert.alert('Erreur réseau', 'Impossible de communiquer avec le serveur.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  // ================================================================
  // CRÉATION D'UNE BASE
  // ================================================================
  const handleAddBase = async () => {
    // Validation
    if (!formData.base_id.trim()) {
      Alert.alert('Erreur', 'L\'ID de la base est obligatoire.');
      return;
    }
    if (!formData.nom_base.trim()) {
      Alert.alert('Erreur', 'Le nom de la base est obligatoire.');
      return;
    }
    if (!formData.api_key.trim()) {
      Alert.alert('Erreur', 'La clé API est obligatoire.');
      return;
    }
    
    if (formData.mode_connexion === 'direct') {
      if (!formData.hote.trim() || !formData.utilisateur.trim()) {
        Alert.alert('Erreur', 'Hôte et utilisateur sont obligatoires en mode direct.');
        return;
      }
    } else {
      if (!formData.bridge_url.trim() || !formData.bridge_token.trim()) {
        Alert.alert('Erreur', 'URL et token du bridge sont obligatoires en mode bridge.');
        return;
      }
    }

    setIsLoading(true);
    try {
      const payload = {
        action: 'add_base',
        user_id: user.id,
        base_id: formData.base_id.trim(),
        nom_base: formData.nom_base.trim(),
        hote: formData.mode_connexion === 'direct' ? formData.hote.trim() : '',
        utilisateur: formData.mode_connexion === 'direct' ? formData.utilisateur.trim() : '',
        mot_passe: formData.mode_connexion === 'direct' ? formData.mot_passe.trim() : '',
        bridge_url: formData.mode_connexion === 'bridge' ? formData.bridge_url.trim() : '',
        bridge_token: formData.mode_connexion === 'bridge' ? formData.bridge_token.trim() : '',
        mode_connexion: formData.mode_connexion,
        api_key: formData.api_key.trim(),
        url: formData.url.trim(),
        tables: formData.tables.trim(),
        statut: formData.statut
      };
      
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert('Succès', 'Base créée avec succès.');
        speak(`Base ${formData.nom_base} créée avec succès.`);
        setAddModalVisible(false);
        resetForm();
        loadBases();
      } else {
        Alert.alert('Erreur', data.error || 'Impossible de créer la base.');
      }
    } catch (e) {
      Alert.alert('Erreur réseau', 'Impossible de communiquer avec le serveur.');
    } finally {
      setIsLoading(false);
    }
  };

  // ================================================================
  // MODIFICATION D'UNE BASE
  // ================================================================
  const handleEditBase = async () => {
    if (!editFormData.base_id.trim()) {
      Alert.alert('Erreur', 'L\'ID de la base est obligatoire.');
      return;
    }
    if (!editFormData.nom_base.trim()) {
      Alert.alert('Erreur', 'Le nom de la base est obligatoire.');
      return;
    }
    if (!editFormData.api_key.trim()) {
      Alert.alert('Erreur', 'La clé API est obligatoire.');
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        action: 'edit_base',
        user_id: user.id,
        original_base_id: selectedBase?.base_id,
        base_id: editFormData.base_id.trim(),
        nom_base: editFormData.nom_base.trim(),
        hote: editFormData.mode_connexion === 'direct' ? editFormData.hote.trim() : '',
        utilisateur: editFormData.mode_connexion === 'direct' ? editFormData.utilisateur.trim() : '',
        mot_passe: editFormData.mode_connexion === 'direct' ? editFormData.mot_passe.trim() : '',
        bridge_url: editFormData.mode_connexion === 'bridge' ? editFormData.bridge_url.trim() : '',
        bridge_token: editFormData.mode_connexion === 'bridge' ? editFormData.bridge_token.trim() : '',
        mode_connexion: editFormData.mode_connexion,
        api_key: editFormData.api_key.trim(),
        url: editFormData.url.trim(),
        tables: editFormData.tables.trim(),
        statut: editFormData.statut
      };
      
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert('Succès', 'Base modifiée avec succès.');
        speak(`Base ${editFormData.nom_base} modifiée avec succès.`);
        setEditModalVisible(false);
        loadBases();
      } else {
        Alert.alert('Erreur', data.error || 'Impossible de modifier la base.');
      }
    } catch (e) {
      Alert.alert('Erreur réseau', 'Impossible de communiquer avec le serveur.');
    } finally {
      setIsLoading(false);
    }
  };

  // ================================================================
  // SUPPRESSION D'UNE BASE
  // ================================================================
  const handleDeleteBase = async () => {
    if (!baseToDelete) return;
    
    setIsLoading(true);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_base',
          user_id: user.id,
          base_id: baseToDelete
        })
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert('Succès', 'Base supprimée avec succès.');
        speak('Base supprimée avec succès.');
        setDeleteModalVisible(false);
        setBaseToDelete(null);
        loadBases();
      } else {
        Alert.alert('Erreur', data.error || 'Impossible de supprimer la base.');
      }
    } catch (e) {
      Alert.alert('Erreur réseau', 'Impossible de communiquer avec le serveur.');
    } finally {
      setIsLoading(false);
    }
  };

  // ================================================================
  // FONCTIONS UTILITAIRES
  // ================================================================
  const resetForm = () => {
    setFormData({
      base_id: '',
      hote: '',
      nom_base: '',
      utilisateur: '',
      mot_passe: '',
      bridge_url: '',
      bridge_token: '',
      mode_connexion: 'direct',
      api_key: '',
      url: '',
      tables: '',
      statut: 'actif'
    });
  };

  const openEditModal = (base) => {
    setSelectedBase(base);
    const isBridge = base.bridge_url && base.bridge_url !== '';
    setEditFormData({
      base_id: base.base_id,
      hote: base.hote || '',
      nom_base: base.nom_base || '',
      utilisateur: base.utilisateur || '',
      mot_passe: '',
      bridge_url: base.bridge_url || '',
      bridge_token: base.bridge_token || '',
      mode_connexion: isBridge ? 'bridge' : 'direct',
      api_key: base.api_key || '',
      url: base.url || '',
      tables: base.tables || '',
      statut: base.statut || 'actif'
    });
    setEditModalVisible(true);
  };

  const openDeleteModal = (baseId) => {
    setBaseToDelete(baseId);
    setDeleteModalVisible(true);
  };

  const getModeLabel = (base) => {
    return base.bridge_url && base.bridge_url !== '' ? '🔗 Bridge' : '🔌 Direct';
  };

  const getModeColor = (base) => {
    return base.bridge_url && base.bridge_url !== '' ? '#8b5cf6' : '#22c55e';
  };

  const getStatutColor = (statut) => {
    return statut === 'actif' ? '#22c55e' : '#ef4444';
  };

  // ================================================================
  // RENDU DES MODALS
  // ================================================================
  const renderAddModal = () => (
    <Modal visible={addModalVisible} transparent animationType="slide" onRequestClose={() => { setAddModalVisible(false); resetForm(); }}>
      <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconWrapper}><Text style={styles.modalIcon}>➕</Text></View>
              <Text style={styles.modalTitle}>Ajouter une base</Text>
              <Text style={styles.modalSubtitle}>Créez une nouvelle base de données</Text>
            </View>
            
            <View style={styles.modalBody}>
              {/* Mode de connexion */}
              <View style={styles.modeSelector}>
                <TouchableOpacity 
                  style={[styles.modeButton, formData.mode_connexion === 'direct' && styles.modeButtonActive]}
                  onPress={() => setFormData({...formData, mode_connexion: 'direct'})}
                >
                  <Text style={[styles.modeButtonText, formData.mode_connexion === 'direct' && styles.modeButtonTextActive]}>🔌 Direct</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modeButton, formData.mode_connexion === 'bridge' && styles.modeButtonActive]}
                  onPress={() => setFormData({...formData, mode_connexion: 'bridge'})}
                >
                  <Text style={[styles.modeButtonText, formData.mode_connexion === 'bridge' && styles.modeButtonTextActive]}>🔗 Bridge</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.inputWrapper}>
                <Text style={styles.inputIcon}>🆔</Text>
                <TextInput style={styles.modalInput} placeholder="ID de la base *" placeholderTextColor="#94a3b8" value={formData.base_id} onChangeText={(text) => setFormData({...formData, base_id: text})} autoCapitalize="none" />
              </View>

              <View style={styles.inputWrapper}>
                <Text style={styles.inputIcon}>📛</Text>
                <TextInput style={styles.modalInput} placeholder="Nom de la base *" placeholderTextColor="#94a3b8" value={formData.nom_base} onChangeText={(text) => setFormData({...formData, nom_base: text})} />
              </View>

              {/* Champs obligatoires user_bases */}
              <View style={styles.inputWrapper}>
                <Text style={styles.inputIcon}>🔑</Text>
                <TextInput style={styles.modalInput} placeholder="Clé API *" placeholderTextColor="#94a3b8" value={formData.api_key} onChangeText={(text) => setFormData({...formData, api_key: text})} autoCapitalize="none" />
              </View>

              <View style={styles.inputWrapper}>
                <Text style={styles.inputIcon}>🔗</Text>
                <TextInput style={styles.modalInput} placeholder="URL (optionnel)" placeholderTextColor="#94a3b8" value={formData.url} onChangeText={(text) => setFormData({...formData, url: text})} autoCapitalize="none" />
              </View>

              <View style={styles.inputWrapper}>
                <Text style={styles.inputIcon}>📋</Text>
                <TextInput style={[styles.modalInput, { minHeight: 60, textAlignVertical: 'top' }]} placeholder="Tables autorisées (séparées par des virgules, optionnel)" placeholderTextColor="#94a3b8" value={formData.tables} onChangeText={(text) => setFormData({...formData, tables: text})} multiline numberOfLines={3} />
              </View>

              {/* Statut */}
              <View style={styles.statusSelector}>
                <Text style={styles.statusLabel}>Statut :</Text>
                <TouchableOpacity 
                  style={[styles.statusButton, formData.statut === 'actif' && styles.statusButtonActive]}
                  onPress={() => setFormData({...formData, statut: 'actif'})}
                >
                  <Text style={[styles.statusButtonText, formData.statut === 'actif' && styles.statusButtonTextActive]}>🟢 Actif</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.statusButton, formData.statut === 'inactif' && styles.statusButtonActive]}
                  onPress={() => setFormData({...formData, statut: 'inactif'})}
                >
                  <Text style={[styles.statusButtonText, formData.statut === 'inactif' && styles.statusButtonTextActive]}>🔴 Inactif</Text>
                </TouchableOpacity>
              </View>

              {formData.mode_connexion === 'direct' ? (
                <>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputIcon}>🌐</Text>
                    <TextInput style={styles.modalInput} placeholder="Hôte *" placeholderTextColor="#94a3b8" value={formData.hote} onChangeText={(text) => setFormData({...formData, hote: text})} autoCapitalize="none" />
                  </View>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputIcon}>👤</Text>
                    <TextInput style={styles.modalInput} placeholder="Utilisateur *" placeholderTextColor="#94a3b8" value={formData.utilisateur} onChangeText={(text) => setFormData({...formData, utilisateur: text})} autoCapitalize="none" />
                  </View>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputIcon}>🔒</Text>
                    <TextInput style={styles.modalInput} placeholder="Mot de passe" placeholderTextColor="#94a3b8" value={formData.mot_passe} onChangeText={(text) => setFormData({...formData, mot_passe: text})} secureTextEntry />
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputIcon}>🔗</Text>
                    <TextInput style={styles.modalInput} placeholder="URL du Bridge *" placeholderTextColor="#94a3b8" value={formData.bridge_url} onChangeText={(text) => setFormData({...formData, bridge_url: text})} autoCapitalize="none" />
                  </View>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputIcon}>🔑</Text>
                    <TextInput style={styles.modalInput} placeholder="Token du Bridge *" placeholderTextColor="#94a3b8" value={formData.bridge_token} onChangeText={(text) => setFormData({...formData, bridge_token: text})} autoCapitalize="none" />
                  </View>
                </>
              )}

              <TouchableOpacity style={[styles.submitButton, isLoading && { opacity: 0.6 }]} onPress={handleAddBase} disabled={isLoading}>
                {isLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.submitButtonText}>✅ Créer la base</Text>}
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.modalCloseButton} onPress={() => { setAddModalVisible(false); resetForm(); }}>
              <Text style={styles.modalCloseText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );

  const renderEditModal = () => (
    <Modal visible={editModalVisible} transparent animationType="slide" onRequestClose={() => setEditModalVisible(false)}>
      <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconWrapper}><Text style={styles.modalIcon}>✏️</Text></View>
              <Text style={styles.modalTitle}>Modifier la base</Text>
              <Text style={styles.modalSubtitle}>Mettez à jour les informations</Text>
            </View>
            
            <View style={styles.modalBody}>
              <View style={styles.modeSelector}>
                <TouchableOpacity 
                  style={[styles.modeButton, editFormData.mode_connexion === 'direct' && styles.modeButtonActive]}
                  onPress={() => setEditFormData({...editFormData, mode_connexion: 'direct'})}
                >
                  <Text style={[styles.modeButtonText, editFormData.mode_connexion === 'direct' && styles.modeButtonTextActive]}>🔌 Direct</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modeButton, editFormData.mode_connexion === 'bridge' && styles.modeButtonActive]}
                  onPress={() => setEditFormData({...editFormData, mode_connexion: 'bridge'})}
                >
                  <Text style={[styles.modeButtonText, editFormData.mode_connexion === 'bridge' && styles.modeButtonTextActive]}>🔗 Bridge</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.inputWrapper}>
                <Text style={styles.inputIcon}>🆔</Text>
                <TextInput style={styles.modalInput} placeholder="ID de la base *" placeholderTextColor="#94a3b8" value={editFormData.base_id} onChangeText={(text) => setEditFormData({...editFormData, base_id: text})} autoCapitalize="none" />
              </View>

              <View style={styles.inputWrapper}>
                <Text style={styles.inputIcon}>📛</Text>
                <TextInput style={styles.modalInput} placeholder="Nom de la base *" placeholderTextColor="#94a3b8" value={editFormData.nom_base} onChangeText={(text) => setEditFormData({...editFormData, nom_base: text})} />
              </View>

              {/* Champs obligatoires user_bases */}
              <View style={styles.inputWrapper}>
                <Text style={styles.inputIcon}>🔑</Text>
                <TextInput style={styles.modalInput} placeholder="Clé API *" placeholderTextColor="#94a3b8" value={editFormData.api_key} onChangeText={(text) => setEditFormData({...editFormData, api_key: text})} autoCapitalize="none" />
              </View>

              <View style={styles.inputWrapper}>
                <Text style={styles.inputIcon}>🔗</Text>
                <TextInput style={styles.modalInput} placeholder="URL (optionnel)" placeholderTextColor="#94a3b8" value={editFormData.url} onChangeText={(text) => setEditFormData({...editFormData, url: text})} autoCapitalize="none" />
              </View>

              <View style={styles.inputWrapper}>
                <Text style={styles.inputIcon}>📋</Text>
                <TextInput style={[styles.modalInput, { minHeight: 60, textAlignVertical: 'top' }]} placeholder="Tables autorisées (séparées par des virgules, optionnel)" placeholderTextColor="#94a3b8" value={editFormData.tables} onChangeText={(text) => setEditFormData({...editFormData, tables: text})} multiline numberOfLines={3} />
              </View>

              {/* Statut */}
              <View style={styles.statusSelector}>
                <Text style={styles.statusLabel}>Statut :</Text>
                <TouchableOpacity 
                  style={[styles.statusButton, editFormData.statut === 'actif' && styles.statusButtonActive]}
                  onPress={() => setEditFormData({...editFormData, statut: 'actif'})}
                >
                  <Text style={[styles.statusButtonText, editFormData.statut === 'actif' && styles.statusButtonTextActive]}>🟢 Actif</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.statusButton, editFormData.statut === 'inactif' && styles.statusButtonActive]}
                  onPress={() => setEditFormData({...editFormData, statut: 'inactif'})}
                >
                  <Text style={[styles.statusButtonText, editFormData.statut === 'inactif' && styles.statusButtonTextActive]}>🔴 Inactif</Text>
                </TouchableOpacity>
              </View>

              {editFormData.mode_connexion === 'direct' ? (
                <>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputIcon}>🌐</Text>
                    <TextInput style={styles.modalInput} placeholder="Hôte *" placeholderTextColor="#94a3b8" value={editFormData.hote} onChangeText={(text) => setEditFormData({...editFormData, hote: text})} autoCapitalize="none" />
                  </View>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputIcon}>👤</Text>
                    <TextInput style={styles.modalInput} placeholder="Utilisateur *" placeholderTextColor="#94a3b8" value={editFormData.utilisateur} onChangeText={(text) => setEditFormData({...editFormData, utilisateur: text})} autoCapitalize="none" />
                  </View>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputIcon}>🔒</Text>
                    <TextInput style={styles.modalInput} placeholder="Mot de passe (laisser vide pour ne pas changer)" placeholderTextColor="#94a3b8" value={editFormData.mot_passe} onChangeText={(text) => setEditFormData({...editFormData, mot_passe: text})} secureTextEntry />
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputIcon}>🔗</Text>
                    <TextInput style={styles.modalInput} placeholder="URL du Bridge *" placeholderTextColor="#94a3b8" value={editFormData.bridge_url} onChangeText={(text) => setEditFormData({...editFormData, bridge_url: text})} autoCapitalize="none" />
                  </View>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputIcon}>🔑</Text>
                    <TextInput style={styles.modalInput} placeholder="Token du Bridge *" placeholderTextColor="#94a3b8" value={editFormData.bridge_token} onChangeText={(text) => setEditFormData({...editFormData, bridge_token: text})} autoCapitalize="none" />
                  </View>
                </>
              )}

              <TouchableOpacity style={[styles.submitButton, isLoading && { opacity: 0.6 }]} onPress={handleEditBase} disabled={isLoading}>
                {isLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.submitButtonText}>💾 Mettre à jour</Text>}
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setEditModalVisible(false)}>
              <Text style={styles.modalCloseText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );

  const renderDeleteModal = () => (
    <Modal visible={deleteModalVisible} transparent animationType="fade" onRequestClose={() => setDeleteModalVisible(false)}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { maxWidth: 380 }]}>
          <View style={styles.modalHeader}>
            <View style={[styles.modalIconWrapper, { backgroundColor: '#fef2f2' }]}>
              <Text style={styles.modalIcon}>🗑️</Text>
            </View>
            <Text style={[styles.modalTitle, { color: '#b91c1c' }]}>Confirmer la suppression</Text>
            <Text style={styles.modalSubtitle}>Voulez-vous vraiment supprimer cette base ?</Text>
          </View>
          <View style={styles.modalBody}>
            <Text style={{ textAlign: 'center', fontSize: 14, color: '#64748b', marginBottom: 16 }}>
              Toutes les données associées seront supprimées.
            </Text>
            <TouchableOpacity style={[styles.submitButton, { backgroundColor: '#ef4444' }]} onPress={handleDeleteBase}>
              <Text style={styles.submitButtonText}>🗑️ Supprimer définitivement</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.modalCloseButton} onPress={() => setDeleteModalVisible(false)}>
            <Text style={styles.modalCloseText}>Annuler</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // ================================================================
  // RENDU PRINCIPAL
  // ================================================================
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.mainContainer} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>🗄️ Gestionnaire de bases</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity 
              onPress={() => { if(isSpeaking) { stopSpeaking(); } else { setAutoSpeak(!autoSpeak); } }} 
              style={[styles.headerActionButton, { marginRight: 8, backgroundColor: autoSpeak ? '#ede9fe' : '#f1f5f9' }]}
            >
              <Text style={styles.headerActionText}>{autoSpeak ? '🔊' : '🔇'}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={loadBases} 
              style={[styles.headerActionButton, { backgroundColor: '#f0f9ff' }]}
            >
              <Text style={styles.headerActionText}>🔄</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.content}>
          {/* Barre d'outils */}
          <View style={styles.toolbar}>
            <TouchableOpacity style={styles.addButton} onPress={() => { setAddModalVisible(true); resetForm(); }}>
              <Text style={styles.addButtonText}>➕ Nouvelle base</Text>
            </TouchableOpacity>
          </View>

          {/* Filtres */}
          <View style={styles.filtersContainer}>
            <View style={styles.searchWrapper}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput 
                style={styles.searchInput} 
                placeholder="Rechercher une base..." 
                placeholderTextColor="#94a3b8"
                value={searchQuery} 
                onChangeText={setSearchQuery} 
              />
            </View>
            <View style={styles.filterButtons}>
              <TouchableOpacity 
                style={[styles.filterButton, filterMode === 'all' && styles.filterButtonActive]}
                onPress={() => setFilterMode('all')}
              >
                <Text style={[styles.filterButtonText, filterMode === 'all' && styles.filterButtonTextActive]}>Tous</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.filterButton, filterMode === 'direct' && styles.filterButtonActive]}
                onPress={() => setFilterMode('direct')}
              >
                <Text style={[styles.filterButtonText, filterMode === 'direct' && styles.filterButtonTextActive]}>🔌</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.filterButton, filterMode === 'bridge' && styles.filterButtonActive]}
                onPress={() => setFilterMode('bridge')}
              >
                <Text style={[styles.filterButtonText, filterMode === 'bridge' && styles.filterButtonTextActive]}>🔗</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.filterButtons, { marginTop: 8 }]}>
              <TouchableOpacity 
                style={[styles.filterButton, filterStatut === 'all' && styles.filterButtonActive]}
                onPress={() => setFilterStatut('all')}
              >
                <Text style={[styles.filterButtonText, filterStatut === 'all' && styles.filterButtonTextActive]}>📊 Tous</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.filterButton, filterStatut === 'actif' && styles.filterButtonActive]}
                onPress={() => setFilterStatut('actif')}
              >
                <Text style={[styles.filterButtonText, filterStatut === 'actif' && styles.filterButtonTextActive]}>🟢 Actifs</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.filterButton, filterStatut === 'inactif' && styles.filterButtonActive]}
                onPress={() => setFilterStatut('inactif')}
              >
                <Text style={[styles.filterButtonText, filterStatut === 'inactif' && styles.filterButtonTextActive]}>🔴 Inactifs</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Liste des bases */}
          <View style={styles.basesList}>
            <Text style={styles.sectionTitle}>📋 Bases ({bases.length})</Text>
            {isLoading ? (
              <View style={styles.loadingCenter}><ActivityIndicator size="large" color="#6c63ff" /></View>
            ) : bases.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🗄️</Text>
                <Text style={styles.emptyText}>Aucune base de données</Text>
                <TouchableOpacity style={styles.emptyButton} onPress={() => { setAddModalVisible(true); resetForm(); }}>
                  <Text style={styles.emptyButtonText}>➕ Créer une base</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={bases.filter(b => {
                  const matchSearch = b.nom_base.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                     b.base_id.toLowerCase().includes(searchQuery.toLowerCase());
                  const isBridge = b.bridge_url && b.bridge_url !== '';
                  const matchMode = filterMode === 'all' || 
                                   (filterMode === 'direct' && !isBridge) || 
                                   (filterMode === 'bridge' && isBridge);
                  const matchStatut = filterStatut === 'all' || b.statut === filterStatut;
                  return matchSearch && matchMode && matchStatut;
                })}
                keyExtractor={(item) => item.base_id}
                renderItem={({ item }) => {
                  const isBridge = item.bridge_url && item.bridge_url !== '';
                  const isActif = item.statut === 'actif';
                  return (
                    <View style={[styles.baseCard, !isActif && styles.baseCardInactif]}>
                      <View style={styles.baseCardHeader}>
                        <View style={styles.baseIconWrapper}>
                          <Text style={styles.baseIcon}>🗄️</Text>
                        </View>
                        <View style={styles.baseInfo}>
                          <Text style={styles.baseName} numberOfLines={1}>{item.nom_base}</Text>
                          <Text style={styles.baseId}>🆔 {item.base_id}</Text>
                        </View>
                        <View style={[styles.modeBadge, { backgroundColor: isBridge ? '#ede9fe' : '#dcfce7' }]}>
                          <Text style={[styles.modeBadgeText, { color: isBridge ? '#7c3aed' : '#16a34a' }]}>
                            {isBridge ? '🔗 Bridge' : '🔌 Direct'}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.baseDetails}>
                        <View style={styles.baseDetailRow}>
                          <Text style={styles.baseDetailLabel}>🔑 API Key:</Text>
                          <Text style={styles.baseDetailValue} numberOfLines={1}>{item.api_key || 'Non défini'}</Text>
                        </View>
                        {item.url && (
                          <View style={styles.baseDetailRow}>
                            <Text style={styles.baseDetailLabel}>🔗 URL:</Text>
                            <Text style={styles.baseDetailValue} numberOfLines={1}>{item.url}</Text>
                          </View>
                        )}
                        {item.tables && (
                          <View style={styles.baseDetailRow}>
                            <Text style={styles.baseDetailLabel}>📋 Tables:</Text>
                            <Text style={styles.baseDetailValue} numberOfLines={2}>{item.tables}</Text>
                          </View>
                        )}
                        <View style={styles.baseDetailRow}>
                          <Text style={styles.baseDetailLabel}>📊 Statut:</Text>
                          <Text style={[styles.baseDetailValue, { color: isActif ? '#22c55e' : '#ef4444', fontWeight: '600' }]}>
                            {isActif ? '🟢 Actif' : '🔴 Inactif'}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.baseActions}>
                        <TouchableOpacity 
                          style={[styles.actionButton, { backgroundColor: '#f0f9ff' }]}
                          onPress={() => openEditModal(item)}
                        >
                          <Text style={styles.actionButtonText}>✏️</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={[styles.actionButton, { backgroundColor: '#fef2f2' }]}
                          onPress={() => openDeleteModal(item.base_id)}
                        >
                          <Text style={styles.actionButtonText}>🗑️</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                }}
                refreshControl={
                  <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadBases(); }} colors={['#6c63ff']} />
                }
                contentContainerStyle={{ paddingBottom: 20 }}
              />
            )}
          </View>
        </View>

        {renderAddModal()}
        {renderEditModal()}
        {renderDeleteModal()}
      </SafeAreaView>
    </Modal>
  );
}

// ================================================================
// STYLES
// ================================================================
const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#ffffff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb'
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a2e', flex: 1, marginLeft: 12 },
  closeButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fef2f2', justifyContent: 'center', alignItems: 'center' },
  closeButtonText: { fontSize: 18, color: '#ef4444', fontWeight: 'bold' },
  headerActionButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  headerActionText: { fontSize: 18 },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  toolbar: { marginBottom: 12 },
  addButton: { backgroundColor: '#6c63ff', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  addButtonText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  filtersContainer: { marginBottom: 12 },
  searchWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 8 },
  searchIcon: { fontSize: 16, marginRight: 8, color: '#94a3b8' },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: '#1e293b' },
  filterButtons: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  filterButton: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#f1f5f9' },
  filterButtonActive: { backgroundColor: '#6c63ff' },
  filterButtonText: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  filterButtonTextActive: { color: '#ffffff' },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8 },
  basesList: { flex: 1 },
  baseCard: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  baseCardInactif: { opacity: 0.6, borderColor: '#fecaca' },
  baseCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  baseIconWrapper: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#ede9fe', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  baseIcon: { fontSize: 20 },
  baseInfo: { flex: 1 },
  baseName: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  baseId: { fontSize: 11, color: '#94a3b8' },
  modeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  modeBadgeText: { fontSize: 10, fontWeight: '600' },
  baseDetails: { marginLeft: 52, marginBottom: 8 },
  baseDetailRow: { flexDirection: 'row', marginBottom: 2, flexWrap: 'wrap' },
  baseDetailLabel: { fontSize: 11, color: '#94a3b8', width: 80 },
  baseDetailValue: { fontSize: 11, color: '#1e293b', flex: 1 },
  baseActions: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end', marginTop: 4 },
  actionButton: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  actionButtonText: { fontSize: 14 },
  loadingCenter: { padding: 40, justifyContent: 'center', alignItems: 'center' },
  emptyState: { padding: 40, alignItems: 'center' },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 16 },
  emptyButton: { backgroundColor: '#6c63ff', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 },
  emptyButtonText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },

  // ===== MODALS =====
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  modalScroll: { width: '100%', maxHeight: '90%' },
  modalContainer: { backgroundColor: '#ffffff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 420 },
  modalHeader: { alignItems: 'center', marginBottom: 20 },
  modalIconWrapper: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#ede9fe', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  modalIcon: { fontSize: 26 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1a1a2e', textAlign: 'center' },
  modalSubtitle: { fontSize: 13, color: '#6b7280', textAlign: 'center', marginTop: 4 },
  modalBody: { width: '100%' },
  modeSelector: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  modeButton: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: '#f1f5f9', alignItems: 'center' },
  modeButtonActive: { backgroundColor: '#6c63ff' },
  modeButtonText: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  modeButtonTextActive: { color: '#ffffff' },
  statusSelector: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  statusLabel: { fontSize: 14, fontWeight: '600', color: '#475569', marginRight: 8 },
  statusButton: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 8, backgroundColor: '#f1f5f9' },
  statusButtonActive: { backgroundColor: '#6c63ff' },
  statusButtonText: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  statusButtonTextActive: { color: '#ffffff' },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', paddingHorizontal: 12, marginBottom: 10 },
  inputIcon: { fontSize: 16, marginRight: 10, color: '#94a3b8' },
  modalInput: { flex: 1, paddingVertical: 12, fontSize: 14, color: '#1e293b' },
  submitButton: { backgroundColor: '#6c63ff', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  submitButtonText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  modalCloseButton: { marginTop: 16, paddingVertical: 10, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  modalCloseText: { fontSize: 14, color: '#64748b', fontWeight: '600' },
});