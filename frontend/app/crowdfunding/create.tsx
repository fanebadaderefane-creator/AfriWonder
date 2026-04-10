import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, BorderRadius, FontSizes } from '../../src/theme/colors';
import { CROWDFUNDING_CATEGORIES } from '../../src/data/crowdfunding';

type Step = 1 | 2 | 3 | 4 | 5;

interface RewardForm {
  id: string;
  title: string;
  description: string;
  amount: string;
  limit: string;
  deliveryDate: string;
}

const DURATION_OPTIONS = [
  { label: '15 jours', value: 15 },
  { label: '30 jours', value: 30 },
  { label: '45 jours', value: 45 },
  { label: '60 jours', value: 60 },
  { label: '90 jours', value: 90 },
];

const PLACEHOLDER_IMAGES = Array.from({ length: 6 }, (_, i) => ({
  id: `img${i}`,
  uri: `https://picsum.photos/400/300?random=${300 + i}`,
}));

export default function CreateProjectScreen() {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>(1);
  const progressAnim = useRef(new Animated.Value(0.2)).current;

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [goalAmount, setGoalAmount] = useState('');
  const [duration, setDuration] = useState(30);
  const [rewards, setRewards] = useState<RewardForm[]>([]);
  const [newReward, setNewReward] = useState<RewardForm>({
    id: '', title: '', description: '', amount: '', limit: '', deliveryDate: '',
  });
  const [idType, setIdType] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);

  const categories = CROWDFUNDING_CATEGORIES.filter(c => c.id !== 'all');

  const animateProgress = (s: Step) => {
    Animated.timing(progressAnim, {
      toValue: s / 5,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const goToStep = (s: Step) => {
    setStep(s);
    animateProgress(s);
  };

  const canProceedStep1 = title.length >= 5 && description.length >= 20 && category !== '';
  const canProceedStep2 = selectedImages.length >= 1;
  const canProceedStep3 = goalAmount.length > 0 && parseInt(goalAmount) >= 50000;
  const canProceedStep5 = idType !== '' && idNumber.length >= 5 && acceptTerms;

  const toggleImage = (uri: string) => {
    setSelectedImages(prev =>
      prev.includes(uri) ? prev.filter(u => u !== uri) : prev.length < 5 ? [...prev, uri] : prev
    );
  };

  const addReward = () => {
    if (newReward.title && newReward.amount && newReward.description) {
      setRewards(prev => [...prev, { ...newReward, id: `r${Date.now()}` }]);
      setNewReward({ id: '', title: '', description: '', amount: '', limit: '', deliveryDate: '' });
    }
  };

  const removeReward = (id: string) => {
    setRewards(prev => prev.filter(r => r.id !== id));
  };

  const handleSubmit = () => {
    Alert.alert(
      'Projet soumis !',
      'Votre projet a ete soumis pour verification. Notre equipe l\'examinera dans les 24-48 heures.',
      [{ text: 'Super !', onPress: () => router.replace('/crowdfunding' as any) }]
    );
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => step === 1 ? router.back() : goToStep((step - 1) as Step)}
            style={styles.headerBtn}
          >
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Creer un projet</Text>
            <Text style={styles.stepIndicator}>Etape {step}/5</Text>
          </View>
          <View style={{ width: 44 }} />
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBg}>
            <Animated.View style={[styles.progressFill, { width: progressWidth }]}>
              <LinearGradient
                colors={['#FF6B00', '#FF3D00']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.progressGradient}
              />
            </Animated.View>
          </View>
          <View style={styles.stepsRow}>
            {[1, 2, 3, 4, 5].map(s => (
              <View
                key={s}
                style={[
                  styles.stepDot,
                  s <= step && styles.stepDotActive,
                  s < step && styles.stepDotDone,
                ]}
              >
                {s < step ? (
                  <Ionicons name="checkmark" size={10} color="#FFF" />
                ) : (
                  <Text style={[styles.stepDotText, s <= step && styles.stepDotTextActive]}>{s}</Text>
                )}
              </View>
            ))}
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* STEP 1: Basic Info */}
          {step === 1 && (
            <View>
              <Text style={styles.sectionTitle}>Informations du projet</Text>
              <Text style={styles.sectionSubtitle}>Decrivez votre projet en quelques mots</Text>

              <Text style={styles.label}>Titre du projet *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Ecole numerique de Bamako"
                placeholderTextColor="#555"
                value={title}
                onChangeText={setTitle}
                maxLength={100}
              />
              <Text style={styles.charCount}>{title.length}/100</Text>

              <Text style={styles.label}>Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Decrivez votre projet, son objectif et son impact..."
                placeholderTextColor="#555"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                maxLength={2000}
              />
              <Text style={styles.charCount}>{description.length}/2000</Text>

              <Text style={styles.label}>Categorie *</Text>
              <View style={styles.categoryGrid}>
                {categories.map(cat => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryItem,
                      category === cat.id && { borderColor: cat.color, backgroundColor: cat.color + '15' },
                    ]}
                    onPress={() => setCategory(cat.id)}
                  >
                    <Ionicons
                      name={cat.icon as any}
                      size={20}
                      color={category === cat.id ? cat.color : '#888'}
                    />
                    <Text style={[
                      styles.categoryItemText,
                      category === cat.id && { color: cat.color },
                    ]}>{cat.name}</Text>
                    {category === cat.id && (
                      <View style={[styles.categoryCheck, { backgroundColor: cat.color }]}>
                        <Ionicons name="checkmark" size={10} color="#FFF" />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.nextBtn, !canProceedStep1 && styles.nextBtnDisabled]}
                onPress={() => canProceedStep1 && goToStep(2)}
                disabled={!canProceedStep1}
              >
                <LinearGradient colors={['#FF6B00', '#FF3D00']} style={styles.nextBtnGradient}>
                  <Text style={styles.nextBtnText}>Continuer</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFF" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {/* STEP 2: Images */}
          {step === 2 && (
            <View>
              <Text style={styles.sectionTitle}>Images du projet</Text>
              <Text style={styles.sectionSubtitle}>Selectionnez 1 a 5 images pour illustrer votre projet</Text>

              <View style={styles.imageGrid}>
                {PLACEHOLDER_IMAGES.map(img => {
                  const isSelected = selectedImages.includes(img.uri);
                  return (
                    <TouchableOpacity
                      key={img.id}
                      style={[styles.imageItem, isSelected && styles.imageItemSelected]}
                      onPress={() => toggleImage(img.uri)}
                      activeOpacity={0.8}
                    >
                      <Image source={{ uri: img.uri }} style={styles.imageThumb} />
                      {isSelected && (
                        <View style={styles.imageCheck}>
                          <Ionicons name="checkmark-circle" size={28} color={Colors.primary} />
                        </View>
                      )}
                      {isSelected && (
                        <View style={styles.imageOrder}>
                          <Text style={styles.imageOrderText}>
                            {selectedImages.indexOf(img.uri) + 1}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.imageHint}>
                {selectedImages.length}/5 images selectionnees
                {selectedImages.length === 0 ? ' (min 1)' : ''}
              </Text>

              <TouchableOpacity
                style={[styles.nextBtn, !canProceedStep2 && styles.nextBtnDisabled]}
                onPress={() => canProceedStep2 && goToStep(3)}
                disabled={!canProceedStep2}
              >
                <LinearGradient colors={['#FF6B00', '#FF3D00']} style={styles.nextBtnGradient}>
                  <Text style={styles.nextBtnText}>Continuer</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFF" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {/* STEP 3: Financial Goal */}
          {step === 3 && (
            <View>
              <Text style={styles.sectionTitle}>Objectif financier</Text>
              <Text style={styles.sectionSubtitle}>Definissez le montant et la duree de votre campagne</Text>

              <Text style={styles.label}>Montant objectif (FCFA) *</Text>
              <View style={styles.amountInputRow}>
                <TextInput
                  style={styles.amountInput}
                  placeholder="500000"
                  placeholderTextColor="#555"
                  value={goalAmount}
                  onChangeText={setGoalAmount}
                  keyboardType="numeric"
                />
                <Text style={styles.amountUnit}>FCFA</Text>
              </View>
              {goalAmount.length > 0 && parseInt(goalAmount) < 50000 && (
                <Text style={styles.errorText}>Minimum 50 000 FCFA</Text>
              )}

              {/* Quick amounts */}
              <View style={styles.quickAmounts}>
                {['500000', '1000000', '2000000', '5000000'].map(amt => (
                  <TouchableOpacity
                    key={amt}
                    style={[
                      styles.quickAmountBtn,
                      goalAmount === amt && styles.quickAmountBtnActive,
                    ]}
                    onPress={() => setGoalAmount(amt)}
                  >
                    <Text style={[
                      styles.quickAmountText,
                      goalAmount === amt && styles.quickAmountTextActive,
                    ]}>{(parseInt(amt) / 1000000).toFixed(1)}M</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Duree de la campagne</Text>
              <View style={styles.durationGrid}>
                {DURATION_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.durationItem,
                      duration === opt.value && styles.durationItemActive,
                    ]}
                    onPress={() => setDuration(opt.value)}
                  >
                    <Text style={[
                      styles.durationDays,
                      duration === opt.value && styles.durationDaysActive,
                    ]}>{opt.value}</Text>
                    <Text style={[
                      styles.durationLabel,
                      duration === opt.value && styles.durationLabelActive,
                    ]}>jours</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Commission info */}
              <View style={styles.infoCard}>
                <Ionicons name="information-circle" size={18} color="#888" />
                <View style={styles.infoCardText}>
                  <Text style={styles.infoTitle}>Commission AfriWonder</Text>
                  <Text style={styles.infoDesc}>3% de commission sur le montant collecte en cas de succes. 0% si l'objectif n'est pas atteint.</Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.nextBtn, !canProceedStep3 && styles.nextBtnDisabled]}
                onPress={() => canProceedStep3 && goToStep(4)}
                disabled={!canProceedStep3}
              >
                <LinearGradient colors={['#FF6B00', '#FF3D00']} style={styles.nextBtnGradient}>
                  <Text style={styles.nextBtnText}>Continuer</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFF" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {/* STEP 4: Rewards */}
          {step === 4 && (
            <View>
              <Text style={styles.sectionTitle}>Recompenses</Text>
              <Text style={styles.sectionSubtitle}>Ajoutez des recompenses pour motiver les contributeurs (optionnel)</Text>

              {/* Existing rewards */}
              {rewards.map(reward => (
                <View key={reward.id} style={styles.rewardPreview}>
                  <View style={styles.rewardPreviewHeader}>
                    <View>
                      <Text style={styles.rewardPreviewTitle}>{reward.title}</Text>
                      <Text style={styles.rewardPreviewAmount}>{parseInt(reward.amount).toLocaleString()} FCFA</Text>
                    </View>
                    <TouchableOpacity onPress={() => removeReward(reward.id)} style={styles.removeBtn}>
                      <Ionicons name="trash" size={16} color="#FF4757" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.rewardPreviewDesc}>{reward.description}</Text>
                  {reward.limit ? <Text style={styles.rewardPreviewMeta}>Limite: {reward.limit} places</Text> : null}
                </View>
              ))}

              {/* Add reward form */}
              <View style={styles.addRewardForm}>
                <Text style={styles.addRewardTitle}>
                  <Ionicons name="add-circle" size={16} color={Colors.primary} /> Ajouter une recompense
                </Text>

                <TextInput
                  style={styles.input}
                  placeholder="Nom de la recompense (ex: Supporter)"
                  placeholderTextColor="#555"
                  value={newReward.title}
                  onChangeText={t => setNewReward(prev => ({ ...prev, title: t }))}
                />
                <TextInput
                  style={[styles.input, { marginTop: 10 }]}
                  placeholder="Description de la recompense"
                  placeholderTextColor="#555"
                  value={newReward.description}
                  onChangeText={t => setNewReward(prev => ({ ...prev, description: t }))}
                  multiline
                />
                <View style={styles.rewardRow}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="Montant (FCFA)"
                    placeholderTextColor="#555"
                    value={newReward.amount}
                    onChangeText={t => setNewReward(prev => ({ ...prev, amount: t }))}
                    keyboardType="numeric"
                  />
                  <TextInput
                    style={[styles.input, { flex: 1, marginLeft: 10 }]}
                    placeholder="Limite (places)"
                    placeholderTextColor="#555"
                    value={newReward.limit}
                    onChangeText={t => setNewReward(prev => ({ ...prev, limit: t }))}
                    keyboardType="numeric"
                  />
                </View>

                <TouchableOpacity
                  style={[
                    styles.addRewardBtn,
                    (!newReward.title || !newReward.amount || !newReward.description) && { opacity: 0.4 },
                  ]}
                  onPress={addReward}
                  disabled={!newReward.title || !newReward.amount || !newReward.description}
                >
                  <Ionicons name="add" size={18} color={Colors.primary} />
                  <Text style={styles.addRewardBtnText}>Ajouter</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.nextBtn} onPress={() => goToStep(5)}>
                <LinearGradient colors={['#FF6B00', '#FF3D00']} style={styles.nextBtnGradient}>
                  <Text style={styles.nextBtnText}>
                    {rewards.length === 0 ? 'Passer cette etape' : 'Continuer'}
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFF" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {/* STEP 5: Verification & Submit */}
          {step === 5 && (
            <View>
              <Text style={styles.sectionTitle}>Verification & Soumission</Text>
              <Text style={styles.sectionSubtitle}>Verifiez votre identite pour publier votre projet</Text>

              {/* Summary Card */}
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Resume du projet</Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Titre</Text>
                  <Text style={styles.summaryValue}>{title}</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Categorie</Text>
                  <Text style={styles.summaryValue}>
                    {categories.find(c => c.id === category)?.name || '-'}
                  </Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Objectif</Text>
                  <Text style={styles.summaryValueHighlight}>
                    {goalAmount ? parseInt(goalAmount).toLocaleString() : '0'} FCFA
                  </Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Duree</Text>
                  <Text style={styles.summaryValue}>{duration} jours</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Images</Text>
                  <Text style={styles.summaryValue}>{selectedImages.length} photo(s)</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Recompenses</Text>
                  <Text style={styles.summaryValue}>{rewards.length} palier(s)</Text>
                </View>
              </View>

              {/* Identity verification */}
              <View style={styles.verifySection}>
                <View style={styles.verifyIconRow}>
                  <Ionicons name="shield-checkmark" size={24} color={Colors.primary} />
                  <Text style={styles.verifyTitle}>Verification d'identite</Text>
                </View>
                <Text style={styles.verifyDesc}>
                  Pour proteger les contributeurs, nous verifions l'identite de chaque createur.
                </Text>

                <Text style={styles.label}>Type de piece d'identite *</Text>
                <View style={styles.idTypeGrid}>
                  {['CNI', 'Passeport', 'Permis'].map(type => (
                    <TouchableOpacity
                      key={type}
                      style={[styles.idTypeItem, idType === type && styles.idTypeItemActive]}
                      onPress={() => setIdType(type)}
                    >
                      <Ionicons
                        name={type === 'CNI' ? 'card' : type === 'Passeport' ? 'document' : 'car'}
                        size={20}
                        color={idType === type ? Colors.primary : '#888'}
                      />
                      <Text style={[styles.idTypeText, idType === type && { color: Colors.primary }]}>
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.label}>Numero du document *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Numero de votre piece d'identite"
                  placeholderTextColor="#555"
                  value={idNumber}
                  onChangeText={setIdNumber}
                />
              </View>

              {/* Terms */}
              <TouchableOpacity
                style={styles.termsRow}
                onPress={() => setAcceptTerms(!acceptTerms)}
              >
                <View style={[styles.checkbox, acceptTerms && styles.checkboxChecked]}>
                  {acceptTerms && <Ionicons name="checkmark" size={14} color="#FFF" />}
                </View>
                <Text style={styles.termsText}>
                  J'accepte les conditions de la plateforme et certifie que les informations fournies sont exactes.
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitBtn, !canProceedStep5 && styles.nextBtnDisabled]}
                onPress={canProceedStep5 ? handleSubmit : undefined}
                disabled={!canProceedStep5}
              >
                <LinearGradient colors={['#4CAF50', '#2E7D32']} style={styles.nextBtnGradient}>
                  <Ionicons name="rocket" size={20} color="#FFF" />
                  <Text style={styles.nextBtnText}>Soumettre le projet</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { alignItems: 'center' },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  stepIndicator: { color: Colors.primary, fontSize: 12, fontWeight: '600', marginTop: 2 },

  // Progress
  progressContainer: { paddingHorizontal: 16, marginBottom: 8 },
  progressBg: { height: 4, backgroundColor: '#1A1A1A', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2, overflow: 'hidden' },
  progressGradient: { flex: 1 },
  stepsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingHorizontal: 4 },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#333',
  },
  stepDotActive: { borderColor: Colors.primary },
  stepDotDone: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  stepDotText: { color: '#666', fontSize: 10, fontWeight: '700' },
  stepDotTextActive: { color: Colors.primary },

  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },

  // Section
  sectionTitle: { color: '#FFF', fontSize: 22, fontWeight: '800', marginBottom: 4 },
  sectionSubtitle: { color: '#888', fontSize: 13, marginBottom: 20 },

  // Form
  label: { color: '#CCC', fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 16 },
  input: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 14,
    color: '#FFF',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#222',
  },
  textArea: { minHeight: 120, textAlignVertical: 'top' },
  charCount: { color: '#555', fontSize: 11, textAlign: 'right', marginTop: 4 },
  errorText: { color: '#FF4757', fontSize: 12, marginTop: 4 },

  // Categories
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#111',
    borderWidth: 1.5,
    borderColor: '#222',
    gap: 6,
  },
  categoryItemText: { color: '#888', fontSize: 13, fontWeight: '600' },
  categoryCheck: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },

  // Images
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  imageItem: {
    width: '31%',
    aspectRatio: 4 / 3,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#222',
  },
  imageItemSelected: { borderColor: Colors.primary },
  imageThumb: { width: '100%', height: '100%' },
  imageCheck: { position: 'absolute', top: 4, right: 4 },
  imageOrder: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageOrderText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  imageHint: { color: '#888', fontSize: 12, textAlign: 'center', marginTop: 12 },

  // Amount
  amountInputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  amountInput: {
    flex: 1,
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
    color: '#FFF',
    fontSize: 22,
    fontWeight: '700',
    borderWidth: 1,
    borderColor: '#222',
    letterSpacing: 1,
  },
  amountUnit: { color: Colors.primary, fontSize: 18, fontWeight: '800' },
  quickAmounts: { flexDirection: 'row', gap: 8, marginTop: 12 },
  quickAmountBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#111',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#222',
  },
  quickAmountBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '15' },
  quickAmountText: { color: '#888', fontSize: 13, fontWeight: '700' },
  quickAmountTextActive: { color: Colors.primary },

  // Duration
  durationGrid: { flexDirection: 'row', gap: 8 },
  durationItem: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#111',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#222',
  },
  durationItemActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '10' },
  durationDays: { color: '#888', fontSize: 18, fontWeight: '800' },
  durationDaysActive: { color: Colors.primary },
  durationLabel: { color: '#555', fontSize: 10, marginTop: 2 },
  durationLabelActive: { color: Colors.primary },

  // Info card
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#111',
    borderRadius: 14,
    padding: 14,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#1A1A1A',
  },
  infoCardText: { flex: 1 },
  infoTitle: { color: '#CCC', fontSize: 13, fontWeight: '700', marginBottom: 4 },
  infoDesc: { color: '#888', fontSize: 12, lineHeight: 18 },

  // Rewards
  rewardPreview: {
    backgroundColor: '#111',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1A1A1A',
  },
  rewardPreviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  rewardPreviewTitle: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  rewardPreviewAmount: { color: Colors.primary, fontSize: 14, fontWeight: '700', marginTop: 2 },
  rewardPreviewDesc: { color: '#AAA', fontSize: 12, lineHeight: 18 },
  rewardPreviewMeta: { color: '#666', fontSize: 11, marginTop: 6 },
  removeBtn: { padding: 8 },

  addRewardForm: {
    backgroundColor: '#0A0A0A',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
    borderStyle: 'dashed',
    marginTop: 8,
  },
  addRewardTitle: { color: '#FFF', fontSize: 14, fontWeight: '700', marginBottom: 12 },
  rewardRow: { flexDirection: 'row', marginTop: 10 },
  addRewardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
  },
  addRewardBtnText: { color: Colors.primary, fontSize: 14, fontWeight: '700' },

  // Summary
  summaryCard: {
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1A1A1A',
  },
  summaryTitle: { color: '#FFF', fontSize: 16, fontWeight: '700', marginBottom: 14 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  summaryLabel: { color: '#888', fontSize: 13 },
  summaryValue: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  summaryValueHighlight: { color: Colors.primary, fontSize: 15, fontWeight: '800' },
  summaryDivider: { height: 1, backgroundColor: '#1A1A1A' },

  // Verification
  verifySection: { marginTop: 20 },
  verifyIconRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  verifyTitle: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  verifyDesc: { color: '#888', fontSize: 13, lineHeight: 19, marginBottom: 4 },
  idTypeGrid: { flexDirection: 'row', gap: 10 },
  idTypeItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#111',
    borderWidth: 1.5,
    borderColor: '#222',
    gap: 4,
  },
  idTypeItemActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '10' },
  idTypeText: { color: '#888', fontSize: 12, fontWeight: '600' },

  // Terms
  termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 20, marginBottom: 10 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#444',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  termsText: { color: '#AAA', fontSize: 13, flex: 1, lineHeight: 19 },

  // Buttons
  nextBtn: { borderRadius: 14, overflow: 'hidden', marginTop: 24 },
  nextBtnDisabled: { opacity: 0.35 },
  nextBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  nextBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  submitBtn: { borderRadius: 14, overflow: 'hidden', marginTop: 20 },
});
