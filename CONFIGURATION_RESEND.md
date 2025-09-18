# 🚀 Configuration Resend - Guide Étape par Étape

## 📋 **Étape 1 : Créer un compte Resend**

1. **Allez sur** : https://resend.com
2. **Cliquez sur "Get Started"**
3. **Inscrivez-vous** avec votre email
4. **Vérifiez votre email** (vous recevrez un email de confirmation)

## 🔑 **Étape 2 : Obtenir votre clé API**

1. **Connectez-vous** à votre dashboard Resend
2. **Allez dans "API Keys"** (menu de gauche)
3. **Cliquez sur "Create API Key"**
4. **Donnez un nom** (ex: "Rezo App")
5. **Copiez la clé API** (commence par `re_`)

## ⚙️ **Étape 3 : Configurer votre .env**

Ajoutez ces lignes à votre fichier `.env` :

```bash
# Email Configuration - Resend (Moderne et gratuit)
RESEND_API_KEY=re_votre_cle_api_ici
RESEND_FROM_EMAIL=Rezo <onboarding@resend.dev>
```

## 🧪 **Étape 4 : Tester la configuration**

1. **Redémarrez votre serveur backend** :
   ```bash
   cd rezo-backend
   npm start
   ```

2. **Vérifiez les logs** - vous devriez voir :
   ```
   🧪 Test configuration Resend...
   ✅ Configuration Resend valide
   ```

## 📧 **Étape 5 : Tester l'envoi d'email**

1. **Allez sur** : http://localhost:3000
2. **Entrez votre email** (ex: `test@example.com`)
3. **Cliquez sur "Recevoir le lien magique"**
4. **Vérifiez votre boîte email** - vous devriez recevoir un email avec le magic link

## 🎯 **Avantages de Resend**

- ✅ **100 000 emails gratuits/mois**
- ✅ **API moderne et simple**
- ✅ **Pas de configuration SMTP complexe**
- ✅ **Spécialement conçu pour les développeurs**
- ✅ **Templates HTML intégrés**
- ✅ **Statistiques d'envoi**

## 🔧 **Dépannage**

### Si vous ne recevez pas d'emails :
1. **Vérifiez votre clé API** dans le dashboard Resend
2. **Vérifiez les logs** du serveur backend
3. **Vérifiez votre dossier spam**
4. **Testez avec un autre email**

### Si l'erreur "Invalid API key" :
1. **Vérifiez que la clé commence par `re_`**
2. **Vérifiez qu'il n'y a pas d'espaces** dans la clé
3. **Recréez une nouvelle clé API** si nécessaire

### Si l'erreur "Domain not verified" :
1. **Utilisez l'email par défaut** : `onboarding@resend.dev`
2. **Ou vérifiez votre domaine** dans le dashboard Resend

## 📚 **Documentation Resend**

- **Documentation officielle** : https://resend.com/docs
- **API Reference** : https://resend.com/docs/api-reference
- **Templates** : https://resend.com/docs/send-with-react

## 🎉 **Prochaines Étapes**

1. **Tester l'envoi d'emails** avec votre vraie clé API
2. **Personnaliser les templates** d'email
3. **Configurer votre domaine** personnalisé
4. **Implémenter les statistiques** d'envoi

---
*Dernière mise à jour : 18 septembre 2025*
