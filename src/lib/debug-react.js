// Script de diagnostic pour vérifier les copies de React
if (typeof window !== 'undefined') {
  console.log('🔍 Diagnostic React:');
  console.log('React version:', window.React?.version || 'Non trouvé');
  console.log('React DOM version:', window.ReactDOM?.version || 'Non trouvé');
  
  // Vérifier si React est disponible globalement
  if (window.React) {
    console.log('✅ React est disponible globalement');
  } else {
    console.log('⚠️ React n\'est pas disponible globalement');
  }
  
  // Vérifier les hooks
  try {
    const React = require('react');
    console.log('✅ React peut être requis:', React.version);
  } catch (e) {
    console.log('❌ Erreur lors de la requête de React:', e.message);
  }
}

