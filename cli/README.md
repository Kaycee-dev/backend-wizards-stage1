# Insighta CLI

Global CLI for Insighta Labs+ Stage 3.

```bash
npm install -g .
insighta login --api-url https://<backend-host>
insighta whoami
insighta profiles list --gender male --country NG --page 2 --limit 20
insighta profiles search "young males from nigeria"
insighta profiles create --name "Harriet Tubman"
insighta profiles export --format csv --country NG
```

Credentials are stored at `~/.insighta/credentials.json`. Access tokens are
sent as bearer tokens and refresh automatically once when the backend returns
`401`.
