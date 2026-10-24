"""
Envoi d'emails par l'API HTTPS de Brevo (https://www.brevo.com).

Pourquoi ? Sur l'hébergement gratuit de Render, les ports SMTP (25, 465, 587) sont
bloqués : Gmail SMTP ne marche pas. L'API de Brevo passe par le port 443 (HTTPS).

Variables d'environnement :
  BREVO_API_KEY       clé API (Brevo > SMTP et API > Clés API)
  EMAIL_EXPEDITEUR    adresse d'expéditeur VÉRIFIÉE dans Brevo (Expéditeurs)
"""
import json
import os
import urllib.error
import urllib.request

from django.core.mail.backends.base import BaseEmailBackend

URL_BREVO = 'https://api.brevo.com/v3/smtp/email'


class BrevoEmailBackend(BaseEmailBackend):
    def send_messages(self, email_messages):
        envoyes = 0
        for message in email_messages:
            corps = {
                'sender': {'name': 'Gestion de Magasin', 'email': message.from_email},
                'to': [{'email': a} for a in message.to],
                'subject': message.subject,
                'textContent': message.body,
            }
            requete = urllib.request.Request(
                URL_BREVO,
                data=json.dumps(corps).encode('utf-8'),
                headers={
                    'api-key': os.environ.get('BREVO_API_KEY', ''),
                    'content-type': 'application/json',
                    'accept': 'application/json',
                },
                method='POST',
            )
            try:
                with urllib.request.urlopen(requete, timeout=15):
                    envoyes += 1
            except (urllib.error.URLError, TimeoutError):
                if not self.fail_silently:
                    raise
        return envoyes
