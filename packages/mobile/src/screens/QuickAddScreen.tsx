import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import type { Expense } from '@expenses/shared';
import { validateExpenseForm } from '@expenses/shared';
import { setExpenses, getExpenses } from '../storage/storageService';

export default function QuickAddScreen() {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Housing');
  const [saving, setSaving] = useState(false);

  const categories = [
    'Housing',
    'Food',
    'Transportation',
    'Utilities',
    'Healthcare',
    'Entertainment',
    'Shopping',
    'Other',
  ];

  const handleAddExpense = async () => {
    // Validate input
    const validation = validateExpenseForm({
      description: description.trim(),
      amount,
      category,
      type: 'expense',
      date: new Date().toISOString().split('T')[0],
      paidBy: 'partner1',
      isRecurring: false,
      recurringDay: 1,
    });

    if (!validation.isValid) {
      Alert.alert('Validation Error', validation.errors[0] || 'Invalid input');
      return;
    }

    setSaving(true);
    try {
      // Get existing expenses
      const expenses = await getExpenses();

      // Create new expense
      const newExpense: Expense = {
        id: Date.now(),
        description: description.trim(),
        amount: parseFloat(amount),
        category,
        type: 'expense',
        date: new Date().toISOString().split('T')[0],
        paidBy: 'partner1',
      };

      // Save to storage
      await setExpenses([...expenses, newExpense]);

      console.log('✅ Expense saved successfully:', newExpense);
      console.log('📊 Total expenses in storage:', expenses.length + 1);

      // Clear form on success
      setDescription('');
      setAmount('');
      setCategory('Housing');

      // Success feedback (mobile only, silent on web)
      Alert.alert('Success', 'Expense added!');
    } catch (error) {
      console.error('❌ Error saving expense:', error);
      Alert.alert('Error', 'Failed to save expense');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Quick Add Expense</Text>

        {/* Amount Input */}
        <View style={styles.field}>
          <Text style={styles.label}>Amount *</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor="#999"
          />
        </View>

        {/* Description Input */}
        <View style={styles.field}>
          <Text style={styles.label}>Description *</Text>
          <TextInput
            style={styles.input}
            value={description}
            onChangeText={setDescription}
            placeholder="What did you buy?"
            placeholderTextColor="#999"
          />
        </View>

        {/* Category Picker */}
        <View style={styles.field}>
          <Text style={styles.label}>Category</Text>
          <View style={styles.categoryGrid}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryButton,
                  category === cat && styles.categoryButtonActive,
                ]}
                onPress={() => setCategory(cat)}
              >
                <Text
                  style={[
                    styles.categoryText,
                    category === cat && styles.categoryTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Add Button */}
        <TouchableOpacity
          style={[styles.addButton, saving && styles.addButtonDisabled]}
          onPress={handleAddExpense}
          disabled={saving}
        >
          <Text style={styles.addButtonText}>
            {saving ? 'Adding...' : 'Add Expense'}
          </Text>
        </TouchableOpacity>

        {/* Info Text */}
        <Text style={styles.infoText}>
          Expense will be saved locally on this device.{'\n'}
          Cloud sync coming in Phase 4.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#333',
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#555',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  categoryButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  categoryText: {
    fontSize: 14,
    color: '#333',
  },
  categoryTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  addButtonDisabled: {
    backgroundColor: '#ccc',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  infoText: {
    marginTop: 16,
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 18,
  },
});
