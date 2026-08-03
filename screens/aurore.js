// aurore.js - Composant de géolocalisation des devices
// DESIGN MODE JOUR - Avec code secret et Google Maps

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, Modal, FlatList, TextInput,
  ScrollView, ActivityIndicator, Alert, RefreshControl, StyleSheet,
  Dimensions, StatusBar, KeyboardAvoidingView, Platform, Linking
} from 'react-native';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';

const API_URL = 'https://cyberic.xyz/api/ia-aurore.php';
const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function Aurore({ user, onClose, visible }) {
  
  // ===== ÉTATS =====
  const [devices, setDevices] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [positions, setPositions] = useState([]);
  const [isLoadingPositions, setIsLoadingPositions] = useState(false);
  
  // États pour les modals
  const [addDeviceModal, setAddDeviceModal] = useState(false);
  const [editDeviceModal, setEditDeviceModal] = useState(false);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState(false);
  const [deviceToDelete, setDeviceToDelete] = useState(null);
  
  // États pour le formulaire
  const [deviceId, setDeviceId] = useState('');
  const [codeSecret, setCodeSecret] = useState('');
  const [deviceType, setDeviceType] = useState('telephone');
  const [deviceCaracteristiques, setDeviceCaracteristiques] = useState('');
  const [editDeviceId, setEditDeviceId] = useState('');
  const [editDeviceType, setEditDeviceType] = useState('telephone');
  const [editDeviceCaracteristiques, setEditDeviceCaracteristiques] = useState('');
  const [editDeviceOriginalId, setEditDeviceOriginalId] = useState('');
  
  // États pour les filtres
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selectedDeviceForMap, setSelectedDeviceForMap] = useState(null);
  const [mapError, setMapError] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  
  // Références
  const mapRef = useRef(null);

  // ================================================================
  // CHARGEMENT DES DONNÉES
  // ================================================================
  useEffect(() => {
    if (visible) {
      loadDevices();
      setMapError(false);
    }
  }, [visible]);

  const loadDevices = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_devices',
          user_id: user.id
        })
      });
      const data = await res.json();
      if (data.success) {
        setDevices(data.devices || []);
      } else {
        Alert.alert('Erreur', data.error || 'Impossible de charger les devices');
      }
    } catch (e) {
      Alert.alert('Erreur réseau', 'Impossible de communiquer avec le serveur.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const loadPositions = async (deviceId) => {
    if (!deviceId) return;
    setIsLoadingPositions(true);
    setMapError(false);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_positions',
          device_id: deviceId,
          user_id: user.id
        })
      });
      const data = await res.json();
      if (data.success) {
        setPositions(data.positions || []);
        setSelectedDeviceForMap(deviceId);
      } else {
        Alert.alert('Erreur', data.error || 'Impossible de charger les positions');
      }
    } catch (e) {
      Alert.alert('Erreur réseau', 'Impossible de charger les positions.');
    } finally {
      setIsLoadingPositions(false);
    }
  };

  // ================================================================
  // GOOGLE MAPS - OUVERTURE
  // ================================================================
  const openGoogleMaps = (latitude, longitude, label) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Erreur', 'Impossible d\'ouvrir Google Maps.');
    });
  };

  // ================================================================
  // HTML DE LA CARTE OPENSTREETMAP - AVEC BOUTON GOOGLE MAPS
  // ================================================================
  const getMapHTML = useCallback(() => {
    if (!positions || positions.length === 0) {
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
          <style>
            * { margin: 0; padding: 0; }
            body { 
              display: flex; 
              justify-content: center; 
              align-items: center; 
              height: 100vh; 
              margin: 0; 
              background: #f8fafc; 
              color: #64748b; 
              font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            }
            .empty-container {
              text-align: center;
              padding: 20px;
            }
            .empty-icon { font-size: 64px; margin-bottom: 16px; }
            .empty-title { color: #1e293b; font-size: 20px; font-weight: 600; margin-bottom: 8px; }
            .empty-sub { color: #94a3b8; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="empty-container">
            <div class="empty-icon">🗺️</div>
            <div class="empty-title">Aucune position disponible</div>
            <div class="empty-sub">Sélectionnez un device pour afficher ses positions</div>
          </div>
        </body>
        </html>
      `;
    }

    // Filtrer les positions avec des coordonnées valides
    const validPositions = positions.filter(p => 
      p.latitude && p.longitude && 
      !isNaN(parseFloat(p.latitude)) && !isNaN(parseFloat(p.longitude))
    );

    if (validPositions.length === 0) {
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * { margin: 0; padding: 0; }
            body { display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f8fafc; color: #64748b; font-family: sans-serif; }
            .error-container { text-align: center; padding: 20px; }
            .error-icon { font-size: 48px; margin-bottom: 16px; }
            .error-title { color: #1e293b; font-size: 18px; font-weight: 600; margin-bottom: 8px; }
            .error-sub { color: #94a3b8; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="error-container">
            <div class="error-icon">⚠️</div>
            <div class="error-title">Coordonnées invalides</div>
            <div class="error-sub">Les positions enregistrées ont des coordonnées invalides</div>
          </div>
        </body>
        </html>
      `;
    }

    // Construire les marqueurs avec le bouton Google Maps
    const markers = validPositions.map((pos, index) => {
      const lat = parseFloat(pos.latitude);
      const lng = parseFloat(pos.longitude);
      const label = pos.adresse || pos.action_type || `Position ${index + 1}`;
      
      // Couleurs selon le type d'action
      let color = '#22c55e';
      let icon = '📍';

      
      const batteryInfo = pos.batterie ? `🔋 ${pos.batterie}%` : '';
      const timeInfo = pos.date_heure ? `🕐 ${new Date(pos.date_heure).toLocaleString('fr-FR')}` : '';
      
      // URL Google Maps
      const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
      
      return `
        L.marker([${lat}, ${lng}], {
          icon: L.divIcon({
            html: '<div style="background:${color};color:white;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:18px;border:3px solid white;box-shadow:0 4px 12px rgba(0,0,0,0.25);">${icon}</div>',
            iconSize: [36, 36],
            className: 'custom-marker'
          })
        }).bindPopup(\`
          <div style="padding:4px;min-width:200px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;">
            <div style="font-weight:600;font-size:15px;color:#1e293b;margin-bottom:6px;">📍 ${label}</div>
            <div style="font-size:12px;color:#64748b;margin-bottom:4px;">Lat: ${lat.toFixed(6)}</div>
            <div style="font-size:12px;color:#64748b;margin-bottom:4px;">Lng: ${lng.toFixed(6)}</div>
            ${timeInfo ? `<div style="font-size:12px;color:#64748b;margin-bottom:4px;">${timeInfo}</div>` : ''}
            ${batteryInfo ? `<div style="font-size:12px;color:#64748b;margin-bottom:8px;">${batteryInfo}</div>` : ''}
            <div style="display:flex;gap:8px;margin-top:8px;border-top:1px solid #e5e7eb;padding-top:8px;">
              <button onclick="window.ReactNativeWebView.postMessage(JSON.stringify({action:'openGoogleMaps',lat:${lat},lng:${lng}}))" 
                style="flex:1;background:#6c63ff;color:white;border:none;padding:8px 12px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;">
                🗺️ Google Maps
              </button>
            </div>
          </div>
        \`).addTo(map);
      `;
    });

    // Calcul du centre
    const centerLat = validPositions.reduce((sum, p) => sum + parseFloat(p.latitude), 0) / validPositions.length;
    const centerLng = validPositions.reduce((sum, p) => sum + parseFloat(p.longitude), 0) / validPositions.length;

    // Construction des coordonnées pour le fitBounds
    const boundsCoords = validPositions.map(p => `[${parseFloat(p.latitude)}, ${parseFloat(p.longitude)}]`).join(',');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <title>Positions</title>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          * { margin: 0; padding: 0; }
          html, body { 
            height: 100%; 
            width: 100%; 
            background: #f8fafc; 
            overflow: hidden;
          }
          #map { 
            height: 100%; 
            width: 100%; 
            background: #f8fafc;
          }
          .custom-marker {
            background: transparent;
            border: none;
          }
          .leaflet-control-zoom {
            border: none !important;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1) !important;
          }
          .leaflet-control-zoom a {
            background: #ffffff !important;
            color: #1e293b !important;
            border: 1px solid #e5e7eb !important;
            font-weight: bold !important;
          }
          .leaflet-control-zoom a:hover {
            background: #f1f5f9 !important;
          }
          .leaflet-popup-content-wrapper {
            background: #ffffff;
            color: #1e293b;
            border-radius: 12px;
            box-shadow: 0 4px 16px rgba(0,0,0,0.12);
            padding: 4px;
            max-width: 280px !important;
          }
          .leaflet-popup-tip {
            background: #ffffff;
          }
          .leaflet-popup-content {
            color: #1e293b;
            font-size: 13px;
            line-height: 1.5;
            min-width: 200px;
            width: auto !important;
            max-width: 280px !important;
          }
          .leaflet-tile-pane {
            filter: brightness(1.05) contrast(1.02);
          }
          .leaflet-tile {
            border-radius: 2px;
          }
          .leaflet-container {
            background: #f8fafc;
          }
          .leaflet-control-attribution {
            background: rgba(255,255,255,0.85) !important;
            color: #64748b !important;
            font-size: 10px !important;
            padding: 2px 8px !important;
            border-radius: 4px !important;
            margin: 4px !important;
          }
          .leaflet-control-attribution a {
            color: #6c63ff !important;
          }
          /* Bouton Google Maps */
          .gmaps-btn {
            background: #6c63ff;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            width: 100%;
            justify-content: center;
            transition: background 0.2s;
          }
          .gmaps-btn:hover {
            background: #5a52e0;
          }
          .gmaps-btn:active {
            transform: scale(0.97);
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          // Initialisation de la carte avec un fond clair
          var map = L.map('map', {
            center: [${centerLat}, ${centerLng}],
            zoom: 13,
            zoomControl: true,
            fadeAnimation: true,
            attributionControl: true
          });
          
          // Tuile OpenStreetMap avec style clair
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            opacity: 1
          }).addTo(map);
          
          // Ajout des marqueurs
          ${markers.join('\n')}
          
          // Ajustement de la vue pour voir tous les marqueurs
          if (${validPositions.length} > 0) {
            var bounds = L.latLngBounds([${boundsCoords}]);
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
          }
          
          // Gestionnaire de messages pour le bouton Google Maps
          document.addEventListener('message', function(e) {
            try {
              var data = JSON.parse(e.data);
              if (data.action === 'openGoogleMaps') {
                // Le message est envoyé au React Native
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  action: 'openGoogleMaps',
                  lat: data.lat,
                  lng: data.lng
                }));
              }
            } catch(err) {
              console.log('Erreur:', err);
            }
          });
          
          // Gestionnaire d'erreur de tuile
          map.on('tileerror', function() {
            console.log('Erreur de chargement de tuile');
          });
          
          // Forcer le rendu après chargement
          setTimeout(function() {
            map.invalidateSize();
          }, 100);
          
          // Réajuster après 500ms
          setTimeout(function() {
            map.invalidateSize();
          }, 500);
        </script>
      </body>
      </html>
    `;
  }, [positions]);

  // ================================================================
  // GESTION DES MESSAGES DU WEBVIEW
  // ================================================================
  const handleWebViewMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.action === 'openGoogleMaps') {
        openGoogleMaps(data.lat, data.lng, 'Position');
      }
    } catch (e) {
      console.log('Erreur message WebView:', e);
    }
  };

  // ================================================================
  // ACTIONS SUR LES DEVICES
  // ================================================================
  const handleAddDevice = async () => {
    if (!deviceId.trim()) {
      Alert.alert('Erreur', 'L\'ID du device est obligatoire.');
      return;
    }
    
    if (!codeSecret.trim() || codeSecret.length !== 6 || !/^\d{6}$/.test(codeSecret)) {
      Alert.alert('Erreur', 'Le code secret doit être un nombre de 6 chiffres.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_device',
          user_id: user.id,
          device_id: deviceId.trim(),
          code_secret: codeSecret.trim(),
          type_device: deviceType,
          caracteristiques: deviceCaracteristiques.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert('Succès', 'Device ajouté avec succès.\nCode secret: ' + codeSecret);
        setAddDeviceModal(false);
        setDeviceId('');
        setCodeSecret('');
        setDeviceCaracteristiques('');
        loadDevices();
      } else {
        Alert.alert('Erreur', data.error || 'Impossible d\'ajouter le device.');
      }
    } catch (e) {
      Alert.alert('Erreur réseau', 'Impossible de communiquer avec le serveur.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditDevice = async () => {
    if (!editDeviceId.trim()) {
      Alert.alert('Erreur', 'L\'ID du device est obligatoire.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_device',
          user_id: user.id,
          original_device_id: editDeviceOriginalId,
          device_id: editDeviceId.trim(),
          type_device: editDeviceType,
          caracteristiques: editDeviceCaracteristiques.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert('Succès', 'Device modifié avec succès.');
        setEditDeviceModal(false);
        setEditDeviceId('');
        setEditDeviceCaracteristiques('');
        loadDevices();
      } else {
        Alert.alert('Erreur', data.error || 'Impossible de modifier le device.');
      }
    } catch (e) {
      Alert.alert('Erreur réseau', 'Impossible de communiquer avec le serveur.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteDevice = async () => {
    if (!deviceToDelete) return;
    
    setIsLoading(true);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_device',
          user_id: user.id,
          device_id: deviceToDelete
        })
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert('Succès', 'Device supprimé avec succès.');
        setDeleteConfirmModal(false);
        setDeviceToDelete(null);
        if (selectedDeviceForMap === deviceToDelete) {
          setSelectedDeviceForMap(null);
          setPositions([]);
        }
        loadDevices();
      } else {
        Alert.alert('Erreur', data.error || 'Impossible de supprimer le device.');
      }
    } catch (e) {
      Alert.alert('Erreur réseau', 'Impossible de communiquer avec le serveur.');
    } finally {
      setIsLoading(false);
    }
  };

  const openEditModal = (device) => {
    setEditDeviceOriginalId(device.device_id);
    setEditDeviceId(device.device_id);
    setEditDeviceType(device.type_device || 'telephone');
    setEditDeviceCaracteristiques(device.caracteristiques || '');
    setEditDeviceModal(true);
  };

  const openDeleteConfirm = (deviceId) => {
    setDeviceToDelete(deviceId);
    setDeleteConfirmModal(true);
  };

  const selectDeviceForMap = (device) => {
    if (selectedDeviceForMap === device.device_id) {
      setSelectedDeviceForMap(null);
      setPositions([]);
    } else {
      loadPositions(device.device_id);
    }
  };

  // ================================================================
  // RENDU DES MODALS
  // ================================================================
  const renderAddDeviceModal = () => (
    <Modal visible={addDeviceModal} transparent animationType="slide" onRequestClose={() => setAddDeviceModal(false)}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { maxWidth: 420 }]}>
          <View style={styles.modalHeader}>
            <View style={styles.modalIconWrapper}><Text style={styles.modalIcon}>📱</Text></View>
            <Text style={styles.modalTitle}>Ajouter un device</Text>
            <Text style={styles.modalSubtitle}>Enregistrez un nouveau device pour le suivi</Text>
          </View>
          <View style={styles.modalBody}>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputIcon}>🆔</Text>
              <TextInput style={styles.modalInput} placeholder="ID du device *" placeholderTextColor="#94a3b8" value={deviceId} onChangeText={setDeviceId} autoCapitalize="none" />
            </View>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputIcon}>🔑</Text>
              <TextInput 
                style={[styles.modalInput, { flex: 1 }]} 
                placeholder="Code secret (6 chiffres) *" 
                placeholderTextColor="#94a3b8" 
                value={codeSecret} 
                onChangeText={(text) => {
                  // Ne garder que les chiffres
                  const cleaned = text.replace(/[^0-9]/g, '');
                  if (cleaned.length <= 6) {
                    setCodeSecret(cleaned);
                  }
                }}
                keyboardType="numeric"
                maxLength={6}
                secureTextEntry={!showSecret}
              />
              <TouchableOpacity onPress={() => setShowSecret(!showSecret)} style={styles.eyeButton}>
                <Text style={styles.eyeText}>{showSecret ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputIcon}>📟</Text>
              <View style={styles.typeSelector}>
                <TouchableOpacity 
                  style={[styles.typeButton, deviceType === 'telephone' && styles.typeButtonActive]}
                  onPress={() => setDeviceType('telephone')}
                >
                  <Text style={[styles.typeButtonText, deviceType === 'telephone' && styles.typeButtonTextActive]}>📱 Téléphone</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.typeButton, deviceType === 'ordinateur' && styles.typeButtonActive]}
                  onPress={() => setDeviceType('ordinateur')}
                >
                  <Text style={[styles.typeButtonText, deviceType === 'ordinateur' && styles.typeButtonTextActive]}>💻 Ordinateur</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputIcon}>📝</Text>
              <TextInput style={[styles.modalInput, { minHeight: 60, textAlignVertical: 'top' }]} placeholder="Caractéristiques (optionnel)" placeholderTextColor="#94a3b8" value={deviceCaracteristiques} onChangeText={setDeviceCaracteristiques} multiline />
            </View>
            <Text style={styles.codeHint}>🔑 Le code secret sera utilisé par le device pour s'authentifier</Text>
            <TouchableOpacity style={[styles.submitButton, isLoading && { opacity: 0.6 }]} onPress={handleAddDevice} disabled={isLoading}>
              {isLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.submitButtonText}>✅ Ajouter</Text>}
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.modalCloseButton} onPress={() => setAddDeviceModal(false)}>
            <Text style={styles.modalCloseText}>Annuler</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderEditDeviceModal = () => (
    <Modal visible={editDeviceModal} transparent animationType="slide" onRequestClose={() => setEditDeviceModal(false)}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { maxWidth: 420 }]}>
          <View style={styles.modalHeader}>
            <View style={styles.modalIconWrapper}><Text style={styles.modalIcon}>✏️</Text></View>
            <Text style={styles.modalTitle}>Modifier le device</Text>
            <Text style={styles.modalSubtitle}>Mettez à jour les informations</Text>
          </View>
          <View style={styles.modalBody}>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputIcon}>🆔</Text>
              <TextInput style={styles.modalInput} placeholder="ID du device *" placeholderTextColor="#94a3b8" value={editDeviceId} onChangeText={setEditDeviceId} autoCapitalize="none" />
            </View>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputIcon}>📟</Text>
              <View style={styles.typeSelector}>
                <TouchableOpacity 
                  style={[styles.typeButton, editDeviceType === 'telephone' && styles.typeButtonActive]}
                  onPress={() => setEditDeviceType('telephone')}
                >
                  <Text style={[styles.typeButtonText, editDeviceType === 'telephone' && styles.typeButtonTextActive]}>📱 Téléphone</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.typeButton, editDeviceType === 'ordinateur' && styles.typeButtonActive]}
                  onPress={() => setEditDeviceType('ordinateur')}
                >
                  <Text style={[styles.typeButtonText, editDeviceType === 'ordinateur' && styles.typeButtonTextActive]}>💻 Ordinateur</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputIcon}>📝</Text>
              <TextInput style={[styles.modalInput, { minHeight: 60, textAlignVertical: 'top' }]} placeholder="Caractéristiques (optionnel)" placeholderTextColor="#94a3b8" value={editDeviceCaracteristiques} onChangeText={setEditDeviceCaracteristiques} multiline />
            </View>
            <TouchableOpacity style={[styles.submitButton, isLoading && { opacity: 0.6 }]} onPress={handleEditDevice} disabled={isLoading}>
              {isLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.submitButtonText}>💾 Mettre à jour</Text>}
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.modalCloseButton} onPress={() => setEditDeviceModal(false)}>
            <Text style={styles.modalCloseText}>Annuler</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderDeleteConfirmModal = () => (
    <Modal visible={deleteConfirmModal} transparent animationType="fade" onRequestClose={() => setDeleteConfirmModal(false)}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { maxWidth: 380 }]}>
          <View style={styles.modalHeader}>
            <View style={[styles.modalIconWrapper, { backgroundColor: '#fef2f2' }]}>
              <Text style={styles.modalIcon}>🗑️</Text>
            </View>
            <Text style={[styles.modalTitle, { color: '#b91c1c' }]}>Confirmer la suppression</Text>
            <Text style={styles.modalSubtitle}>Voulez-vous vraiment supprimer ce device ?</Text>
          </View>
          <View style={styles.modalBody}>
            <Text style={{ textAlign: 'center', fontSize: 14, color: '#64748b', marginBottom: 16 }}>
              Cette action est irréversible.
            </Text>
            <TouchableOpacity style={[styles.submitButton, { backgroundColor: '#ef4444' }]} onPress={handleDeleteDevice}>
              <Text style={styles.submitButtonText}>🗑️ Supprimer définitivement</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.modalCloseButton} onPress={() => setDeleteConfirmModal(false)}>
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
          <Text style={styles.headerTitle}>🗺️ Géolocalisation</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity 
              onPress={() => setAddDeviceModal(true)} 
              style={[styles.headerActionButton, { marginRight: 8, backgroundColor: '#dcfce7' }]}
            >
              <Text style={styles.headerActionText}>➕</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={loadDevices} 
              style={[styles.headerActionButton, { backgroundColor: '#f0f9ff' }]}
            >
              <Text style={styles.headerActionText}>🔄</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.content}>
          {/* Filtres */}
          <View style={styles.filtersContainer}>
            <View style={styles.searchWrapper}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput 
                style={styles.searchInput} 
                placeholder="Rechercher un device..." 
                placeholderTextColor="#94a3b8"
                value={searchQuery} 
                onChangeText={setSearchQuery} 
              />
            </View>
            <View style={styles.filterButtons}>
              <TouchableOpacity 
                style={[styles.filterButton, filterType === 'all' && styles.filterButtonActive]}
                onPress={() => setFilterType('all')}
              >
                <Text style={[styles.filterButtonText, filterType === 'all' && styles.filterButtonTextActive]}>Tous</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.filterButton, filterType === 'telephone' && styles.filterButtonActive]}
                onPress={() => setFilterType('telephone')}
              >
                <Text style={[styles.filterButtonText, filterType === 'telephone' && styles.filterButtonTextActive]}>📱</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.filterButton, filterType === 'ordinateur' && styles.filterButtonActive]}
                onPress={() => setFilterType('ordinateur')}
              >
                <Text style={[styles.filterButtonText, filterType === 'ordinateur' && styles.filterButtonTextActive]}>💻</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Liste des devices */}
          <View style={styles.devicesList}>
            <Text style={styles.sectionTitle}>📋 Devices ({devices.length})</Text>
            {isLoading ? (
              <View style={styles.loadingCenter}><ActivityIndicator size="large" color="#6c63ff" /></View>
            ) : devices.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📱</Text>
                <Text style={styles.emptyText}>Aucun device enregistré</Text>
                <TouchableOpacity style={styles.emptyButton} onPress={() => setAddDeviceModal(true)}>
                  <Text style={styles.emptyButtonText}>➕ Ajouter un device</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={devices.filter(d => {
                  const matchSearch = d.device_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                     (d.caracteristiques && d.caracteristiques.toLowerCase().includes(searchQuery.toLowerCase()));
                  const matchType = filterType === 'all' || d.type_device === filterType;
                  return matchSearch && matchType;
                })}
                keyExtractor={(item) => item.device_id}
                renderItem={({ item }) => (
                  <View style={[styles.deviceCard, selectedDeviceForMap === item.device_id && styles.deviceCardSelected]}>
                    <TouchableOpacity 
                      style={styles.deviceCardContent}
                      onPress={() => selectDeviceForMap(item)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.deviceCardHeader}>
                        <View style={styles.deviceIconWrapper}>
                          <Text style={styles.deviceIcon}>
                            {item.type_device === 'telephone' ? '📱' : '💻'}
                          </Text>
                        </View>
                        <View style={styles.deviceInfo}>
                          <Text style={styles.deviceName} numberOfLines={1}>{item.device_id}</Text>
                          <Text style={styles.deviceType}>{item.type_device || 'Non défini'}</Text>
                        </View>
                        <View style={styles.deviceStatusBadge}>
                          <Text style={[styles.deviceStatusText, 
                            item.statut === 'actif' ? styles.statusActif : 
                            item.statut === 'inactif' ? styles.statusInactif : 
                            styles.statusEnAttente
                          ]}>
                            ● {item.statut || 'en_attente'}
                          </Text>
                        </View>
                      </View>
                      {item.caracteristiques && (
                        <Text style={styles.deviceCaracteristiques} numberOfLines={2}>
                          {item.caracteristiques}
                        </Text>
                      )}
                      <Text style={styles.deviceDate}>
                        🕐 {new Date(item.created_at).toLocaleString()}
                      </Text>
                    </TouchableOpacity>
                    <View style={styles.deviceActions}>
                      <TouchableOpacity 
                        style={[styles.deviceActionButton, { backgroundColor: '#f0f9ff' }]}
                        onPress={() => openEditModal(item)}
                      >
                        <Text style={styles.deviceActionText}>✏️</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.deviceActionButton, { backgroundColor: '#fef2f2' }]}
                        onPress={() => openDeleteConfirm(item.device_id)}
                      >
                        <Text style={styles.deviceActionText}>🗑️</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
                refreshControl={
                  <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadDevices(); }} colors={['#6c63ff']} />
                }
                contentContainerStyle={{ paddingBottom: 20 }}
              />
            )}
          </View>

          {/* Carte OpenStreetMap */}
          <View style={styles.mapContainer}>
            <Text style={styles.sectionTitle}>
              🗺️ Positions {selectedDeviceForMap ? `- ${selectedDeviceForMap}` : ''}
            </Text>
            {isLoadingPositions ? (
              <View style={styles.mapLoading}>
                <ActivityIndicator size="large" color="#6c63ff" />
                <Text style={styles.mapLoadingText}>Chargement des positions...</Text>
              </View>
            ) : (
              <View style={styles.mapWrapper}>
                <WebView
                  ref={mapRef}
                  source={{ html: getMapHTML() }}
                  style={styles.map}
                  javaScriptEnabled={true}
                  domStorageEnabled={true}
                  scrollEnabled={true}
                  showsVerticalScrollIndicator={false}
                  showsHorizontalScrollIndicator={false}
                  onError={() => setMapError(true)}
                  onMessage={handleWebViewMessage}
                  onLoadEnd={() => {
                    if (mapRef.current) {
                      setTimeout(() => {
                        mapRef.current.injectJavaScript(`
                          if (window.map) {
                            setTimeout(function() {
                              window.map.invalidateSize();
                            }, 100);
                          }
                          true;
                        `);
                      }, 200);
                    }
                  }}
                />
                {mapError && (
                  <View style={styles.mapErrorOverlay}>
                    <Text style={styles.mapErrorText}>⚠️ Erreur de chargement de la carte</Text>
                    <TouchableOpacity 
                      style={styles.mapErrorButton}
                      onPress={() => {
                        setMapError(false);
                        if (selectedDeviceForMap) {
                          loadPositions(selectedDeviceForMap);
                        }
                      }}
                    >
                      <Text style={styles.mapErrorButtonText}>🔄 Réessayer</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>

        {renderAddDeviceModal()}
        {renderEditDeviceModal()}
        {renderDeleteConfirmModal()}
      </SafeAreaView>
    </Modal>
  );
}

// ================================================================
// STYLES - MODE JOUR (comme Eric IA)
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
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 12, backgroundColor: '#ffffff' },
  filtersContainer: { marginBottom: 12 },
  searchWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 8 },
  searchIcon: { fontSize: 16, marginRight: 8, color: '#94a3b8' },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: '#1e293b' },
  filterButtons: { flexDirection: 'row', gap: 8 },
  filterButton: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#f1f5f9' },
  filterButtonActive: { backgroundColor: '#6c63ff' },
  filterButtonText: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  filterButtonTextActive: { color: '#ffffff' },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8 },
  devicesList: { flex: 0.4, minHeight: 150 },
  deviceCard: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#e5e7eb', flexDirection: 'row', alignItems: 'center' },
  deviceCardSelected: { borderColor: '#6c63ff', borderWidth: 2 },
  deviceCardContent: { flex: 1 },
  deviceCardHeader: { flexDirection: 'row', alignItems: 'center' },
  deviceIconWrapper: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#ede9fe', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  deviceIcon: { fontSize: 20 },
  deviceInfo: { flex: 1 },
  deviceName: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  deviceType: { fontSize: 11, color: '#64748b' },
  deviceStatusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  deviceStatusText: { fontSize: 10, fontWeight: '600' },
  statusActif: { color: '#22c55e' },
  statusInactif: { color: '#ef4444' },
  statusEnAttente: { color: '#f59e0b' },
  deviceCaracteristiques: { fontSize: 12, color: '#64748b', marginTop: 4, marginLeft: 52 },
  deviceDate: { fontSize: 10, color: '#94a3b8', marginTop: 2, marginLeft: 52 },
  deviceActions: { flexDirection: 'row', gap: 4, marginLeft: 8 },
  deviceActionButton: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  deviceActionText: { fontSize: 14 },
  mapContainer: { flex: 1, marginTop: 8, minHeight: 200 },
  mapWrapper: { flex: 1, borderRadius: 12, overflow: 'hidden', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e5e7eb', minHeight: 200 },
  map: { flex: 1, backgroundColor: '#f8fafc' },
  mapLoading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 12, minHeight: 200 },
  mapLoadingText: { color: '#64748b', marginTop: 12, fontSize: 14 },
  mapErrorOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.9)', justifyContent: 'center', alignItems: 'center', borderRadius: 12 },
  mapErrorText: { fontSize: 14, color: '#64748b', marginBottom: 12 },
  mapErrorButton: { backgroundColor: '#6c63ff', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  mapErrorButtonText: { color: '#ffffff', fontWeight: '600' },
  loadingCenter: { padding: 40, justifyContent: 'center', alignItems: 'center' },
  emptyState: { padding: 40, alignItems: 'center' },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 16 },
  emptyButton: { backgroundColor: '#6c63ff', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 },
  emptyButtonText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  modalContainer: { backgroundColor: '#ffffff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 420, maxHeight: '90%' },
  modalHeader: { alignItems: 'center', marginBottom: 20 },
  modalIconWrapper: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#ede9fe', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  modalIcon: { fontSize: 26 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1a1a2e', textAlign: 'center' },
  modalSubtitle: { fontSize: 13, color: '#6b7280', textAlign: 'center', marginTop: 4 },
  modalBody: { width: '100%' },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', paddingHorizontal: 12, marginBottom: 12 },
  inputIcon: { fontSize: 16, marginRight: 10, color: '#94a3b8' },
  modalInput: { flex: 1, paddingVertical: 12, fontSize: 14, color: '#1e293b' },
  eyeButton: { padding: 6 },
  eyeText: { fontSize: 18 },
  codeHint: { fontSize: 11, color: '#94a3b8', textAlign: 'center', marginBottom: 12, marginTop: -4 },
  typeSelector: { flexDirection: 'row', flex: 1, gap: 8, paddingVertical: 4 },
  typeButton: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#f1f5f9', flex: 1, alignItems: 'center' },
  typeButtonActive: { backgroundColor: '#6c63ff' },
  typeButtonText: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  typeButtonTextActive: { color: '#ffffff' },
  submitButton: { backgroundColor: '#6c63ff', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  submitButtonText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  modalCloseButton: { marginTop: 16, paddingVertical: 10, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  modalCloseText: { fontSize: 14, color: '#64748b', fontWeight: '600' },
});