const play = require("play-dl");
const {
	Client,
	GatewayIntentBits,
	EmbedBuilder
} = require("discord.js");
const {
	joinVoiceChannel,
	createAudioPlayer,
	createAudioResource,
	AudioPlayerStatus
} = require("@discordjs/voice");

const client = new Client({intents:[
	GatewayIntentBits.Guilds,
	GatewayIntentBits.GuildMessages,
	GatewayIntentBits.MessageContent,
	GatewayIntentBits.GuildVoiceStates
]});

const DiscordToken  = "discord-token";
const player = createAudioPlayer();
const queue = [];
let connection, current;

client.on("ready", async () => {
	client.application.commands.create({
		name: "play",
		description: "Adicione uma música na playlist.",
		options: [{
			name: "musica",
			description: "Nome ou URL da música",
			type: 3,
			required: true
		}]
	});
	
	client.application.commands.create({
		name: "list",
		description: "Liste as próximas músicas da playlist."
	});
	
	client.application.commands.create({
		name: "pause",
		description: "Pause a playlist."
	});
	
	client.application.commands.create({
		name: "resume",
		description: "Retome a playlist."
	});
	
	client.application.commands.create({
		name: "stop",
		description: "Pare e resete a playlist."
	});
	
	client.application.commands.create({
		name: "skip",
		description: "Pule a música atual da playlist."
	});
	
	client.application.commands.create({
		name: "pop",
		description: "Remova a última música da playlist."
	});
	
	client.application.commands.create({
		name: "tocando",
		description: "Descubra qual música está tocando"
	});
	
	client.user.setPresence({
		activities: [{
			name: "nada",
			type: 2
		}]
	});
});

client.on("interactionCreate", async (interaction) => {
	if (interaction.commandName == "play") {
		const termo = interaction.options.getString("musica").trim();
		const channel = interaction.member.voice.channel;
		let url;
		
		if (!channel) {
			const embed = new EmbedBuilder()
				.setColor(0xFF0000)
				.setTitle("Você precisa estar em um canal de voz!");
			
			interaction.reply({
					embeds: [embed],
					ephemeral: true
			});
			return;
		}
		
		if (!connection) {
			connection = joinVoiceChannel({
				channelId: channel.id,
				guildId: channel.guild.id,
				adapterCreator: client.guilds.cache.first().voiceAdapterCreator
			});
		}
		
		const video = await play.search(termo, {
			number: 1,
			unblurNSFWThumbnails: true,
			source: {
				youtube: "video"
			}
		});
		
		if (video[0]) url = video[0].url;
		else url = termo;
		
		const info = await searchMusic(url);
		
		if (!info) {
			const embed = new EmbedBuilder()
				.setColor(0xFF0000)
				.setTitle(`Música não encontrada: **${url}**`);
			
			interaction.reply({
					embeds: [embed],
					ephemeral: true
			});
			return;
		}
		
		const stream = await play.stream_from_info(info);
		
		queue.push({
			resource: createAudioResource(stream.stream, {
				inputType: stream.type
			}),
			video_details: info.video_details,
			related_video: info.related_videos?.[0]
		});
			
		const embed = new EmbedBuilder()
			.setColor(0xFF0000)
			.setTitle(info.video_details.title)
			.setURL(info.video_details.url)
			.setAuthor({
				name: info.video_details.channel.name,
				iconURL: info.video_details.channel.icons?.[0].url,
				url: info.video_details.channel.url
			})
			.setImage(
				info.video_details.thumbnails?.[info.video_details.thumbnails?.length-1].url)
			.addFields(
				{name: "Duração", value: String(info.video_details.durationRaw), inline: true},
				{name: "Views", value: String(info.video_details.views), inline: true},
				{name: "Likes", value: String(info.video_details.likes), inline: true}
			);
			
		interaction.reply({
			content: "Música adicionada à playlist.",
			embeds: [embed],
		});
		
		if (player.state.status != AudioPlayerStatus.Playing &&
			player.state.status != AudioPlayerStatus.Buffering) {
			playNextMusic();
		}
	}
	else if (interaction.commandName == "list") {
		const embed = new EmbedBuilder()
			.setTitle("Próximas Músicas da Playlist")
			.setColor(0xFF0000);
			
		for (let i=0; i<queue.length; i++) {
			const music = queue[i];
			embed.addFields({
				name: `${i+1}. ${music.video_details.title}`,
				value: `Duração: ${music.video_details.durationRaw}`
			});
		}

		interaction.reply({
			embeds: [embed],
			ephemeral: true
		});
	}
	else if (interaction.commandName == "pause") {
		interaction.reply("Pausando.");
		player.pause();
	}
	else if (interaction.commandName == "resume") {
		interaction.reply("Retomando.");
		player.unpause();
	}
	else if (interaction.commandName == "stop") {
		interaction.reply("Parando.");
		player.stop();
		connection.destroy();
		connection = null;
		
		client.user.setPresence({
			activities: [{
				name: "nada",
				type: 2
			}]
		});
		while(queue.length > 0) queue.shift();
	}
	else if (interaction.commandName == "skip") {
		interaction.reply("Pulando música.");
		playNextMusic();
	}
	else if (interaction.commandName == "pop") {
		interaction.reply("Removendo última música da playlist.");
		queue.pop();
	}
	else if (interaction.commandName == "tocando") {
		if (!current) {
			const embed = new EmbedBuilder()
				.setColor(0xFF0000)
				.setTitle("Nenhuma música tocando agora.");
			
			interaction.reply({
					embeds: [embed],
					ephemeral: true
			});
			return;
		}
		
		const embed = new EmbedBuilder()
			.setColor(0xFF0000)
			.setTitle(current.video_details.title)
			.setURL(current.video_details.url)
			.setAuthor({
				name: current.video_details.channel.name,
				iconURL: current.video_details.channel.icons?.[0].url,
				url: current.video_details.channel.url
			})
			.setImage(
				current.video_details.thumbnails?.[current.video_details.thumbnails?.length-1].url)
			.addFields(
				{name: "Duração", value: String(current.video_details.durationRaw), inline: true},
				{name: "Views", value: String(current.video_details.views), inline: true},
				{name: "Likes", value: String(current.video_details.likes), inline: true}
			);
			
		interaction.reply({
			content: "Tocando agora:",
			embeds: [embed],
			ephemeral: true
		});
	}
});

client.on("voiceStateUpdate", (oldState, newState) => {
	if (newState.member.user.id != client.user.id) return;
	if (newState.channelId) return;

	player.stop();
	connection?.destroy();
	connection = null;
});

player.on(AudioPlayerStatus.Idle, () => {
	playNextMusic();
});

client.login(DiscordToken);

async function searchMusic(url) {
	try {
		return await play.video_info(url);
	}
	catch(e) {
		return null;
	}
}

async function playNextMusic() {
	const music = queue.shift();
	if (!music) return;
	
	current = music;
	connection.subscribe(player);
	player.play(music.resource);
	
	client.user.setPresence({
		activities: [{
			name: music.video_details.title,
			type: 2
		}]
	});
	
	if (queue.length == 0) {
		const info = await searchMusic(music.related_video);
		const stream = await play.stream_from_info(info);
		
		queue.push({
			resource: createAudioResource(stream.stream, {
				inputType: stream.type
			}),
			video_details: info.video_details,
			related_video: info.related_videos?.[0]
		});
	}
}