import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../../theme/ThemeContext';

type ToastType = 'success' | 'error' | 'info';

type ToastPayload = { message: string; type?: ToastType; duration?: number };

interface ToastContextType {
  showToast: (payload: ToastPayload) => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [type, setType] = useState<ToastType>('info');
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback(
    ({ message: msg, type: t = 'info', duration = 3200 }: ToastPayload) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setMessage(msg);
      setType(t);
      setVisible(true);
      opacity.setValue(0);
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
      timerRef.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() =>
          setVisible(false)
        );
      }, duration);
    },
    [opacity]
  );

  const bg =
    type === 'success' ? colors.success + 'EE' : type === 'error' ? colors.error + 'EE' : colors.card;

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {visible ? (
        <Animated.View
          style={[
            styles.wrap,
            {
              paddingTop: insets.top + 8,
              opacity,
            },
          ]}
          pointerEvents="box-none"
        >
          <Pressable
            style={[styles.banner, { backgroundColor: bg, borderColor: colors.border }]}
            onPress={() => setVisible(false)}
            accessibilityRole="alert"
            accessibilityLabel={message}
          >
            <Text style={[styles.text, { color: type === 'error' || type === 'success' ? '#FFF' : colors.text }]}>
              {message}
            </Text>
          </Pressable>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99999,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  banner: {
    maxWidth: '92%',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  text: { fontSize: 16, lineHeight: 22, fontWeight: '600', textAlign: 'center' },
});
