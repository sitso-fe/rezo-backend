// Patterns pour détecter les informations personnelles
const personalInfoPatterns = [
  // Numéros de téléphone
  /(\+33|0)[1-9](\d{8}|\s\d{2}\s\d{2}\s\d{2}\s\d{2})/g,
  // Emails
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  // Adresses (patterns français)
  /\b\d+\s+(rue|avenue|boulevard|place|impasse|allée|chemin|route)\s+/gi,
  // Codes postaux français
  /\b\d{5}\b/g,
  // Numéros de sécurité sociale (approximatif)
  /\b[12]\d{2}(0[1-9]|1[0-2])\d{8}\b/g,
  // Numéros de carte bancaire
  /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
  // Dates de naissance potentielles
  /\b(0[1-9]|[12]\d|3[01])[\/\-](0[1-9]|1[0-2])[\/\-](19|20)\d{2}\b/g
];

// Mots toxiques et inappropriés
const toxicWords = [
  // Insultes communes
  'connard', 'salope', 'pute', 'merde', 'putain', 'con', 'conne',
  'enculé', 'bâtard', 'fils de pute', 'ta mère', 'fdp',
  // Termes discriminatoires
  'pédé', 'tapette', 'négro', 'bougnoule', 'youpin', 'raton',
  // Termes haineux
  'nazi', 'hitler', 'mort aux', 'crève', 'suicide',
  // Vulgarités sexuelles explicites
  'bite', 'chatte', 'cul', 'sexe', 'baiser', 'niquer'
];

// Patterns pour détecter le contenu toxique
const toxicPatterns = [
  // Menaces
  /je vais te (tuer|buter|niquer|défoncer)/gi,
  // Incitation à la violence
  /(mort|crève|suicide|tue-toi)/gi,
  // Harcèlement
  /(ferme ta gueule|ta gueule|dégage|casse-toi)/gi
];

/**
 * Vérifie si le texte contient des informations personnelles
 * @param {string} text - Le texte à vérifier
 * @returns {boolean} - True si des informations personnelles sont détectées
 */
function containsPersonalInfo(text) {
  if (!text || typeof text !== 'string') return false;
  
  return personalInfoPatterns.some(pattern => pattern.test(text));
}

/**
 * Vérifie si le texte contient du contenu toxique
 * @param {string} text - Le texte à vérifier
 * @returns {boolean} - True si du contenu toxique est détecté
 */
function containsToxicContent(text) {
  if (!text || typeof text !== 'string') return false;
  
  const lowerText = text.toLowerCase();
  
  // Vérifier les mots toxiques
  const containsToxicWords = toxicWords.some(word => 
    lowerText.includes(word.toLowerCase())
  );
  
  // Vérifier les patterns toxiques
  const containsToxicPatterns = toxicPatterns.some(pattern => 
    pattern.test(text)
  );
  
  return containsToxicWords || containsToxicPatterns;
}

/**
 * Nettoie le texte en remplaçant le contenu inapproprié
 * @param {string} text - Le texte à nettoyer
 * @returns {string} - Le texte nettoyé
 */
function cleanText(text) {
  if (!text || typeof text !== 'string') return text;
  
  let cleanedText = text;
  
  // Remplacer les informations personnelles par des astérisques
  personalInfoPatterns.forEach(pattern => {
    cleanedText = cleanedText.replace(pattern, '***');
  });
  
  // Remplacer les mots toxiques par des astérisques
  toxicWords.forEach(word => {
    const regex = new RegExp(word, 'gi');
    cleanedText = cleanedText.replace(regex, '*'.repeat(word.length));
  });
  
  return cleanedText;
}

/**
 * Obtient des conseils de sécurité basés sur le type de contenu détecté
 * @param {string} text - Le texte à analyser
 * @returns {string[]} - Liste des conseils de sécurité
 */
function getSafetyTips(text) {
  const tips = [];
  
  if (containsPersonalInfo(text)) {
    tips.push("Évite de partager des informations personnelles comme ton numéro de téléphone, adresse ou email.");
  }
  
  if (containsToxicContent(text)) {
    tips.push("Restons respectueux et bienveillants dans nos échanges.");
    tips.push("Si tu ressens de la colère, prends une pause avant de répondre.");
  }
  
  return tips;
}

/**
 * Analyse complète du contenu
 * @param {string} text - Le texte à analyser
 * @returns {Object} - Résultat de l'analyse
 */
function analyzeContent(text) {
  return {
    hasPersonalInfo: containsPersonalInfo(text),
    hasToxicContent: containsToxicContent(text),
    cleanedText: cleanText(text),
    safetyTips: getSafetyTips(text),
    isAppropriate: !containsPersonalInfo(text) && !containsToxicContent(text)
  };
}

module.exports = {
  containsPersonalInfo,
  containsToxicContent,
  cleanText,
  getSafetyTips,
  analyzeContent
};
