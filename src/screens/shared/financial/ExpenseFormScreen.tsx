import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import * as expenseService from '../../../services/expenseService';

const RECURRENCE_OPTIONS = [
  { key: 'none', label: 'Nenhuma' },
  { key: 'weekly', label: 'Semanal' },
  { key: 'monthly', label: 'Mensal' },
  { key: 'yearly', label: 'Anual' },
];

const PAYMENT_METHODS = [
  { key: 'pix', label: 'Pix', icon: 'qr-code' as const },
  { key: 'cash', label: 'Dinheiro', icon: 'cash' as const },
  { key: 'credit_card', label: 'Cartão Crédito', icon: 'card' as const },
  { key: 'debit_card', label: 'Cartão Débito', icon: 'card-outline' as const },
  { key: 'bank_transfer', label: 'Transferência', icon: 'swap-horizontal' as const },
  { key: 'other', label: 'Outro', icon: 'ellipsis-horizontal' as const },
];

export default function ExpenseFormScreen({ navigation, route }: any) {
  const { colors, isDark } = useTheme();
  const existingExpense: expenseService.Expense | null = route.params?.expense || null;
  const isEditing = !!existingExpense;

  const [categories, setCategories] = useState<expenseService.FinancialCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [categoryId, setCategoryId] = useState(
    existingExpense ? (typeof existingExpense.categoryId === 'object' ? existingExpense.categoryId._id : existingExpense.categoryId) : ''
  );
  const [description, setDescription] = useState(existingExpense?.description || '');
  const [amount, setAmount] = useState(existingExpense ? String(existingExpense.amount) : '');
  const [dueDate, setDueDate] = useState(existingExpense?.dueDate?.split('T')[0] || '');
  const [paymentMethod, setPaymentMethod] = useState(existingExpense?.paymentMethod || '');
  const [recurrence, setRecurrence] = useState(existingExpense?.recurrence || 'none');
  const [notes, setNotes] = useState(existingExpense?.notes || '');

  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showRecurrencePicker, setShowRecurrencePicker] = useState(false);
  const [showMethodPicker, setShowMethodPicker] = useState(false);

  const isReadOnly = isEditing && existingExpense?.status === 'paid';

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    try {
      let cats = await expenseService.listCategories('expense');
      if (cats.length === 0) {
        await expenseService.seedCategories();
        cats = await expenseService.listCategories('expense');
      }
      setCategories(cats);
    } catch (e: any) {
      Alert.alert('Erro', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!categoryId) return Alert.alert('Atenção', 'Selecione uma categoria');
    if (!description.trim()) return Alert.alert('Atenção', 'Informe a descrição');
    const amountNum = parseFloat(amount.replace(',', '.'));
    if (isNaN(amountNum) || amountNum <= 0) return Alert.alert('Atenção', 'Informe um valor válido');
    if (!dueDate) return Alert.alert('Atenção', 'Informe a data de vencimento');

    setSaving(true);
    try {
      const data: expenseService.CreateExpenseParams = {
        categoryId,
        description: description.trim(),
        amount: amountNum,
        dueDate,
        paymentMethod: paymentMethod || undefined,
        notes: notes.trim() || undefined,
        recurrence,
      };

      if (isEditing && existingExpense) {
        await expenseService.updateExpense(existingExpense._id, data);
        Alert.alert('Sucesso', 'Despesa atualizada', [{ text: 'OK', onPress: () => navigation.goBack() }]);
      } else {
        await expenseService.createExpense(data);
        Alert.alert('Sucesso', 'Despesa criada', [{ text: 'OK', onPress: () => navigation.goBack() }]);
      }
    } catch (e: any) {
      Alert.alert('Erro', e.message);
    } finally {
      setSaving(false);
    }
  };

  const selectedCategory = categories.find((c) => c._id === categoryId);
  const selectedMethod = PAYMENT_METHODS.find((m) => m.key === paymentMethod);
  const selectedRecurrence = RECURRENCE_OPTIONS.find((r) => r.key === recurrence);

  const styles = createStyles(colors, isDark);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? 'Editar Despesa' : 'Nova Despesa'}</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving || isReadOnly} style={styles.saveBtn}>
          {saving
            ? <ActivityIndicator size="small" color={colors.primary} />
            : <Text style={[styles.saveBtnText, isReadOnly && { color: colors.textTertiary }]}>Salvar</Text>
          }
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {isReadOnly && (
            <View style={[styles.readOnlyBanner, { backgroundColor: isDark ? '#1F3D1F' : '#E8FFF0' }]}>
              <Ionicons name="lock-closed" size={14} color="#50C878" />
              <Text style={{ color: '#50C878', fontSize: 12, marginLeft: 6 }}>
                Despesa paga — somente visualização
              </Text>
            </View>
          )}

          {/* Categoria */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Categoria *</Text>
            <TouchableOpacity
              style={[styles.picker, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => !isReadOnly && setShowCategoryPicker(true)}
              disabled={isReadOnly}
            >
              <Text style={[styles.pickerText, { color: selectedCategory ? colors.textPrimary : colors.textTertiary }]}>
                {selectedCategory?.name || 'Selecionar categoria...'}
              </Text>
              <Ionicons name="chevron-down" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>

          {/* Descrição */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Descrição *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
              value={description}
              onChangeText={setDescription}
              placeholder="Ex: Aluguel do consultório"
              placeholderTextColor={colors.textTertiary}
              editable={!isReadOnly}
            />
          </View>

          {/* Valor */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Valor (R$) *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
              value={amount}
              onChangeText={setAmount}
              placeholder="0,00"
              placeholderTextColor={colors.textTertiary}
              keyboardType="decimal-pad"
              editable={!isReadOnly}
            />
          </View>

          {/* Data de vencimento */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Data de Vencimento *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
              value={dueDate}
              onChangeText={setDueDate}
              placeholder="AAAA-MM-DD"
              placeholderTextColor={colors.textTertiary}
              editable={!isReadOnly}
            />
          </View>

          {/* Recorrência */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Recorrência</Text>
            <TouchableOpacity
              style={[styles.picker, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => !isReadOnly && setShowRecurrencePicker(true)}
              disabled={isReadOnly}
            >
              <Text style={[styles.pickerText, { color: colors.textPrimary }]}>
                {selectedRecurrence?.label || 'Nenhuma'}
              </Text>
              <Ionicons name="chevron-down" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>

          {/* Método de pagamento (opcional) */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Forma de Pagamento (opcional)</Text>
            <TouchableOpacity
              style={[styles.picker, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => !isReadOnly && setShowMethodPicker(true)}
              disabled={isReadOnly}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {selectedMethod && <Ionicons name={selectedMethod.icon} size={16} color={colors.textSecondary} />}
                <Text style={[styles.pickerText, { color: selectedMethod ? colors.textPrimary : colors.textTertiary }]}>
                  {selectedMethod?.label || 'Selecionar...'}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>

          {/* Observações */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Observações (opcional)</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Anotações adicionais..."
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={3}
              editable={!isReadOnly}
            />
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* Modal Categoria */}
      <Modal visible={showCategoryPicker} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowCategoryPicker(false)} activeOpacity={1}>
          <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Categoria</Text>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat._id}
                style={[styles.modalOption, categoryId === cat._id && { backgroundColor: isDark ? '#1A2E3D' : '#E8F4FD' }]}
                onPress={() => { setCategoryId(cat._id); setShowCategoryPicker(false); }}
              >
                <Text style={[styles.modalOptionText, { color: colors.textPrimary }]}>{cat.name}</Text>
                {categoryId === cat._id && <Ionicons name="checkmark" size={18} color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal Recorrência */}
      <Modal visible={showRecurrencePicker} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowRecurrencePicker(false)} activeOpacity={1}>
          <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Recorrência</Text>
            {RECURRENCE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={[styles.modalOption, recurrence === opt.key && { backgroundColor: isDark ? '#1A2E3D' : '#E8F4FD' }]}
                onPress={() => { setRecurrence(opt.key as any); setShowRecurrencePicker(false); }}
              >
                <Text style={[styles.modalOptionText, { color: colors.textPrimary }]}>{opt.label}</Text>
                {recurrence === opt.key && <Ionicons name="checkmark" size={18} color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal Método de Pagamento */}
      <Modal visible={showMethodPicker} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowMethodPicker(false)} activeOpacity={1}>
          <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Forma de Pagamento</Text>
            <View style={styles.methodGrid}>
              {PAYMENT_METHODS.map((m) => (
                <TouchableOpacity
                  key={m.key}
                  style={[
                    styles.methodOption,
                    { backgroundColor: isDark ? colors.surfaceSecondary : '#f5f5f5', borderColor: colors.border },
                    paymentMethod === m.key && { borderColor: colors.primary, backgroundColor: isDark ? '#1A2E3D' : '#E8F4FD' },
                  ]}
                  onPress={() => { setPaymentMethod(m.key); setShowMethodPicker(false); }}
                >
                  <Ionicons name={m.icon} size={22} color={paymentMethod === m.key ? colors.primary : colors.textSecondary} />
                  <Text style={[styles.methodLabel, { color: paymentMethod === m.key ? colors.primary : colors.textSecondary }]}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary },
  saveBtn: { width: 60, alignItems: 'flex-end', justifyContent: 'center' },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: colors.primary },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1, padding: 16 },
  readOnlyBanner: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 8, marginBottom: 16 },
  fieldGroup: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 },
  input: {
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: colors.textPrimary,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  picker: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
  },
  pickerText: { fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '70%' },
  modalTitle: { fontSize: 16, fontWeight: '700', marginBottom: 16 },
  modalOption: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 12, borderRadius: 8, marginBottom: 4,
  },
  modalOptionText: { fontSize: 15 },
  methodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  methodOption: {
    width: '30%', aspectRatio: 1, borderRadius: 12, borderWidth: 1,
    justifyContent: 'center', alignItems: 'center', gap: 6,
  },
  methodLabel: { fontSize: 11, fontWeight: '500', textAlign: 'center' },
});
