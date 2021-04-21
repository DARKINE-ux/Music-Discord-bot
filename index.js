const DisTube = require("distube")
const Discord = require("discord.js")
const client = new Discord.Client()
const fs = require("fs")
const config = require("./config.json")
const express = require("express");

const app = express();
app.get("/", (request, response) => {
  const ping = new Date();
  ping.setHours(ping.getHours() - 3);
  console.log(`Ping recebido às ${ping.getUTCHours()}:${ping.getUTCMinutes()}:${ping.getUTCSeconds()}`);
  response.sendStatus(200);
});
app.listen(process.env.PORT); // Recebe solicitações que o deixa online

client.config = require("./config.json")
client.distube = new DisTube(client, { searchSongs: true, emitNewSongOnly: true, leaveOnFinish: true })
client.commands = new Discord.Collection()
client.aliases = new Discord.Collection()
client.emotes = config.emoji

fs.readdir("./commands/", (err, files) => {
    if (err) return console.log("Não foi possível encontrar nenhum comando!")
    const jsFiles = files.filter(f => f.split(".").pop() === "js")
    if (jsFiles.length <= 0) return console.log("Não foi possível encontrar nenhum comando!")
    jsFiles.forEach(file => {
        const cmd = require(`./commands/${file}`)
        console.log(`Carregado ${file}`)
        client.commands.set(cmd.name, cmd)
        if (cmd.aliases) cmd.aliases.forEach(alias => client.aliases.set(alias, cmd.name))
    })
})

client.on("ready", () => {
    console.log(`${client.user.tag} está pronto para tocar música.`)
    const server = client.voice.connections.size
})

client.on("message", async message => {
    const prefix = config.prefix
    if (!message.content.startsWith(prefix)) return
    const args = message.content.slice(prefix.length).trim().split(/ +/g)
    const command = args.shift().toLowerCase()
    const cmd = client.commands.get(command) || client.commands.get(client.aliases.get(command))
    if (!cmd) return
    if (cmd.inVoiceChannel && !message.member.voice.channel) return message.channel.send(`${client.emotes.error} **Entre em um canal de voz para poder utilizar o comando!**`)
    try {
        cmd.run(client, message, args)
    } catch (e) {
        console.error(e)
        message.reply(`Error: ${e}`)
    }
})

const status = queue => `Volume: \`${queue.volume}%\` | Filtro: \`${queue.filter || "Off"}\` | Loop: \`${queue.repeatMode ? queue.repeatMode === 2 ? "Toda a fila" : "Essa musica" : "Off"}\` | Autoplay: \`${queue.autoplay ? "On" : "Off"}\``
client.distube
    .on("playSong", (message, queue, song) => message.channel.send(
        `${client.emotes.play} | Tocando \`${song.name}\` - \`${song.formattedDuration}\`\nRequerido por: ${song.user}\n${status(queue)}`
    ))
    .on("addSong", (message, queue, song) => message.channel.send(
        `${client.emotes.success} | Adicionado ${song.name} - \`${song.formattedDuration}\` para a fila por ${song.user}`
    ))
    .on("playList", (message, queue, playlist, song) => message.channel.send(
        `${client.emotes.play} | Tocar \`${playlist.title}\` playlist (${playlist.total_items} Musicas).\nRequerido por: ${song.user}\nTocando agora \`${song.name}\` - \`${song.formattedDuration}\`\n${status(queue)}`
    ))
    .on("addList", (message, queue, playlist) => message.channel.send(
        `${client.emotes.success} | Adicionado \`${playlist.title}\` playlist (${playlist.total_items} Musicas) enfileirar\n${status(queue)}`
    ))
    // DisTubeOptions.searchSongs = true
    .on("searchResult", (message, result) => {
        let i = 0;
        const Re = new Discord.MessageEmbed()
        .setDescription(`**Escolha uma opção abaixo**\n${result.map(song => `**${++i}**. ${song.name} - \`${song.formattedDuration}\``).join("\n")}\n*Digite qualquer outra coisa ou aguarde 60 segundos para cancelar*`)
        .setColor("BLUE")
        message.channel.send(Re)
    })
    // DisTubeOptions.searchSongs = true
    .on("searchCancel", message => message.channel.send(`${client.emotes.error} **Pesquisa cancelada**`))
    .on("error", (message, err) => message.channel.send(`${client.emotes.error} **Um erro encontrado:** ${err}`))

client.login(config.token)
