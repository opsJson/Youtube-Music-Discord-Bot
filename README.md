# Youtube-Music-Discord-Bot
### How it Works
```/play``` Inicie uma playlist com uma música, buscando por nome ou url no Youtube. Sempre que a playlist for terminar, uma música parecida com a última começa a tocar.  
```/pause``` Pausa a música.  
```/resume``` Retoma a música.  
```/stop``` Para a música, e limpa a playlist.  
```/skip``` Pula a música atual.  
```/list``` Exite a playlist.  
```/tocando``` Exibe a música tocando agora.  
```/remove``` Remove uma música da playlist.  

### Quick Start
Create your bot and get your ```DiscordToken``` at https://discord.com/developers/applications  

```bash
npm init -y
npm install discord.js
npm install @discordjs/voice
npm install play-dl
npm install libsodium-wrappers
node .
```
