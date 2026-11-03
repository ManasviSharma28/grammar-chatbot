import { useRef, useState, type ComponentRef, type Ref } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { ExampleCard } from '@/features/practice/example-card';
import { useTheme } from '@/hooks/use-theme';

// One schema holds all the rules, instead of if-statements spread through the screen.
const signUpSchema = z.object({
  name: z.string().trim().min(2, 'Enter at least 2 characters.'),
  email: z.email('Enter a valid email address.'),
  password: z.string().min(8, 'Use at least 8 characters.'),
});

type InputRef = ComponentRef<typeof TextInput>;
type Values = z.infer<typeof signUpSchema>;
type FieldName = keyof Values;

const EMPTY: Values = { name: '', email: '', password: '' };
const NO_FIELDS_TOUCHED: Record<FieldName, boolean> = { name: false, email: false, password: false };

export function FormExamples() {
  const [values, setValues] = useState(EMPTY);
  const [touched, setTouched] = useState(NO_FIELDS_TOUCHED);
  const [savedName, setSavedName] = useState('');
  const nameRef = useRef<InputRef>(null);
  const emailRef = useRef<InputRef>(null);
  const passwordRef = useRef<InputRef>(null);

  // Errors are calculated from the values, so they can never be out of date.
  const result = signUpSchema.safeParse(values);
  const errors = result.success ? {} : z.flattenError(result.error).fieldErrors;

  function setField(field: FieldName, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setSavedName('');
  }

  function markTouched(field: FieldName) {
    setTouched((current) => ({ ...current, [field]: true }));
  }

  function submit() {
    if (!result.success) {
      // Show every error, then take the user to the first one.
      setTouched({ name: true, email: true, password: true });
      if (errors.name) nameRef.current?.focus();
      else if (errors.email) emailRef.current?.focus();
      else passwordRef.current?.focus();
      return;
    }
    setSavedName(result.data.name);
    setValues(EMPTY);
    setTouched(NO_FIELDS_TOUCHED);
  }

  return (
    // Scrolls the focused input above the keyboard. Needs KeyboardProvider in the root layout.
    <KeyboardAwareScrollView
      bottomOffset={Spacing.six}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">
      <ExampleCard
        title="Sign-up form"
        problem="The keyboard covers inputs, errors appear too early and users can't move between fields.">
        <Field
          ref={nameRef}
          label="Name"
          value={values.name}
          // Errors wait until the user leaves the field, so typing isn't interrupted.
          error={touched.name ? errors.name?.[0] : undefined}
          onChangeText={(text) => setField('name', text)}
          onBlur={() => markTouched('name')}
          autoComplete="name"
          textContentType="name"
          returnKeyType="next"
          // submitBehavior keeps the keyboard open while focus moves to the next field.
          submitBehavior="submit"
          onSubmitEditing={() => emailRef.current?.focus()}
        />
        <Field
          ref={emailRef}
          label="Email"
          value={values.email}
          error={touched.email ? errors.email?.[0] : undefined}
          onChangeText={(text) => setField('email', text.trim())}
          onBlur={() => markTouched('email')}
          // The right keyboard, with no auto-capitalizing or correcting of addresses.
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />
        <Field
          ref={passwordRef}
          label="Password"
          value={values.password}
          error={touched.password ? errors.password?.[0] : undefined}
          onChangeText={(text) => setField('password', text)}
          onBlur={() => markTouched('password')}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="done"
          onSubmitEditing={submit}
        />
        <Button label="Create account" onPress={submit} />
        {savedName ? (
          <Text variant="small" color="success">
            Account created for {savedName}.
          </Text>
        ) : null}
      </ExampleCard>
    </KeyboardAwareScrollView>
  );
}

type FieldProps = TextInputProps & {
  label: string;
  error?: string;
  ref?: Ref<InputRef>;
};

function Field({ label, error, ...rest }: FieldProps) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      <Text variant="smallStrong">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        // Screen readers announce the error when the user reaches this field.
        accessibilityHint={error}
        placeholderTextColor={theme.textSecondary}
        style={[
          styles.input,
          {
            color: theme.text,
            backgroundColor: theme.surfaceMuted,
            borderColor: error ? theme.danger : 'transparent',
          },
        ]}
        {...rest}
      />
      {error ? (
        <Text variant="small" color="danger">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: Spacing.four, padding: Spacing.four, paddingBottom: Spacing.six },
  field: { gap: Spacing.one },
  input: {
    height: 46,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
    fontSize: 16,
  },
});
