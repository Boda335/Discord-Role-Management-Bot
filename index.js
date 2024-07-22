const {
    Client,
    GatewayIntentBits,
    REST,
    Routes,
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    PermissionsBitField
} = require('discord.js');
const fs = require('fs');
const config = require('./config');
const sectionsFilePath = './sections.json';
require('dotenv').config();

const commands = [
    new SlashCommandBuilder()
        .setName('role')
        .setDescription('لارسال لوحة التحكم الخاصة بالرتب!')
        .toJSON(),
    new SlashCommandBuilder()
        .setName('add_section')
        .setDescription('إضافة قسم جديد')
        .addStringOption(option =>
            option.setName('section')
                .setDescription('اسم القسم')
                .setRequired(true)),
    new SlashCommandBuilder()
        .setName('addrole')
        .setDescription('إضافة رتبة إلى قسم معين')
        .addStringOption(option =>
            option.setName('section')
                .setDescription('اسم القسم')
                .setRequired(true))
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('الرتبة التي تريد إضافتها')
                .setRequired(true)),
    new SlashCommandBuilder()
        .setName('delete_section')
        .setDescription('حذف قسم وما يحتويه من رتب')
        .addStringOption(option =>
            option.setName('section')
                .setDescription('اسم القسم الذي تريد حذفه')
                .setRequired(true)),
    new SlashCommandBuilder()
        .setName('remove_role')
        .setDescription('حذف رتبة من قسم معين')
        .addStringOption(option =>
            option.setName('section')
                .setDescription('اسم القسم')
                .setRequired(true))
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('الرتبة التي تريد حذفها')
                .setRequired(true)),
    new SlashCommandBuilder()
        .setName('section_list')
        .setDescription('عرض جميع الأقسام في السيرفر'),
    new SlashCommandBuilder()
        .setName('role_list')
        .setDescription('عرض جميع الأقسام والرتب الموجودة فيها'),
    new SlashCommandBuilder()
        .setName('help')
        .setDescription('لعرض قائمة بالأوامر المتاحة')
        .toJSON(),
];

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ]
});

client.once('ready', async () => {
    try {
        console.log('Started refreshing application (/) commands.');
        await rest.put(
            Routes.applicationCommands(config.clientId),
            { body: commands },
        );
        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error('Error refreshing commands:', error);
    }
    
    // Print status table
    printStatusTable(commands);

    console.log(`Logged in as ${client.user.tag}!`);
    console.log(`Code by boda 3350`);
    console.log(`https://discord.gg/DzjuTABN6E`);
});

function printStatusTable(commands) {
    const header = '┌───────────────────────────────┬────────────┐';
    const footer = '└───────────────────────────────┴────────────┘';
    const separator = '│                               │            │';
    const divider = '│───────────────────────────────│────────────│';

    // Print header
    console.log(header);
    console.log('│ Command Name                  │   Status   │');
    console.log(divider); // Added divider

    // Print each command status
    commands.forEach(cmd => {
        const name = cmd.name.padEnd(29, ' ');
        const status = '✔️'.padEnd(7, ' '); // Assuming all commands are successfully loaded
        console.log(`│ ${name} │    ${status}  │`);
    });

    // Print footer
    console.log(footer);
}

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const sectionsData = fs.existsSync(sectionsFilePath) ? JSON.parse(fs.readFileSync(sectionsFilePath, 'utf8')) : {};

    if (interaction.commandName === 'role') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.reply({ content: 'ليس لديك الصلاحية لاستخدام هذا الامر.', ephemeral: true });
            return;
        }

        // تحقق من وجود أقسام في الملف
        const guildId = interaction.guild.id;
        if (!sectionsData[guildId] || Object.keys(sectionsData[guildId].sections).length === 0) {
            await interaction.reply({ content: ' لا توجد أقسام مسجلة في هذا السيرفراستعمل الامر', ephemeral: true });
            return;
        }

        try {
            const embed = new EmbedBuilder()
                .setColor('#3F7FFA')
                .setThumbnail(config.thumbnail)
                .setTitle('اختر الرتب التي تناسبك.')
                .setDescription('اختر الرتب المناسبة لك من القائمة التالية.\n\n [Support](https://discord.gg/DzjuTABN6E) | [Invite](https://discord.com/oauth2/authorize?client_id=1230958297318686751)')
                .setImage(config.image)
                .setFooter({ text: config.footer.text, iconURL: config.footer.iconURL });

            const rows = [];
            Object.keys(sectionsData[guildId].sections).forEach((sectionKey) => {
                const section = sectionsData[guildId].sections[sectionKey];
                
                // تحقق من وجود شروط في القسم
                if (!section.roles || section.roles.length === 0) {
                    console.warn(`Section ${sectionKey} does not have any roles.`);
                    return;
                }

                const options = section.roles.map(role => ({
                    label: role.name,
                    value: role.id,
                    description: role.name,
                }));

                // تقسيم الخيارات إلى عدة قوائم إذا كانت أكثر من 25
                for (let i = 0; i < options.length; i += 25) {
                    const selectMenuOptions = options.slice(i, i + 25); // أخذ أول 25 خيار

                    const selectMenu = new StringSelectMenuBuilder()
                        .setCustomId(`select_${sectionKey}_${Math.floor(i / 25)}`)
                        .setPlaceholder(sectionKey)
                        .addOptions(selectMenuOptions);

                    rows.push(new ActionRowBuilder().addComponents(selectMenu));
                }
            });

            if (rows.length === 0) {
                await interaction.reply({ content: 'لا توجد رتب متاحة في الأقسام المسجلة.', ephemeral: true });
                return;
            }

            await interaction.reply({ embeds: [embed], components: rows });
        } catch (error) {
            console.error('Error handling /role command:', error);
            await interaction.reply({ content: 'حدث خطأ أثناء معالجة الأمر.', ephemeral: true });
        }

        
    } else if (interaction.commandName === 'add_section') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.reply({ content: 'ليس لديك الصلاحية لاستخدام هذا الامر.', ephemeral: true });
            return;
        }

        const sectionName = interaction.options.getString('section');
        const guildId = interaction.guild.id;

        if (!sectionsData[guildId]) {
            sectionsData[guildId] = { sections: {} };
        }

        if (sectionsData[guildId].sections[sectionName]) {
            await interaction.reply({ content: 'القسم موجود بالفعل.', ephemeral: true });
            return;
        }

        sectionsData[guildId].sections[sectionName] = { roles: [] };
        fs.writeFileSync(sectionsFilePath, JSON.stringify(sectionsData, null, 2));
        await interaction.reply({ content: `تم إضافة القسم ${sectionName} بنجاح.`, ephemeral: true });
    } else if (interaction.commandName === 'addrole') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.reply({ content: 'ليس لديك الصلاحية لاستخدام هذا الامر.', ephemeral: true });
            return;
        }

        const sectionName = interaction.options.getString('section');
        const role = interaction.options.getRole('role');
        const guildId = interaction.guild.id;

        if (!sectionsData[guildId] || !sectionsData[guildId].sections[sectionName]) {
            await interaction.reply({ content: 'القسم غير موجود.', ephemeral: true });
            return;
        }

        const section = sectionsData[guildId].sections[sectionName];

        if (section.roles.some(r => r.id === role.id)) {
            await interaction.reply({ content: 'الرتبة موجودة بالفعل في هذا القسم.', ephemeral: true });
            return;
        }

        if (section.roles.length >= 25) {
            await interaction.reply({ content: 'وصلت إلى الحد الأقصى من الرتب في هذا القسم. يرجى إنشاء قسم جديد.', ephemeral: true });
            return;
        }

        section.roles.push({ id: role.id, name: role.name });
        fs.writeFileSync(sectionsFilePath, JSON.stringify(sectionsData, null, 2));
        await interaction.reply({ content: `تم إضافة الرتبة ${role.name} إلى القسم ${sectionName} بنجاح.`, ephemeral: true });
    } else if (interaction.commandName === 'delete_section') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.reply({ content: 'ليس لديك الصلاحية لاستخدام هذا الامر.', ephemeral: true });
            return;
        }

        const sectionName = interaction.options.getString('section');
        const guildId = interaction.guild.id;

        if (!sectionsData[guildId] || !sectionsData[guildId].sections[sectionName]) {
            await interaction.reply({ content: 'القسم غير موجود.', ephemeral: true });
            return;
        }

        delete sectionsData[guildId].sections[sectionName];
        fs.writeFileSync(sectionsFilePath, JSON.stringify(sectionsData, null, 2));
        await interaction.reply({ content: `تم حذف القسم ${sectionName} بنجاح.`, ephemeral: true });
    } else if (interaction.commandName === 'remove_role') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.reply({ content: 'ليس لديك الصلاحية لاستخدام هذا الامر.', ephemeral: true });
            return;
        }

        const sectionName = interaction.options.getString('section');
        const role = interaction.options.getRole('role');
        const guildId = interaction.guild.id;

        if (!sectionsData[guildId] || !sectionsData[guildId].sections[sectionName]) {
            await interaction.reply({ content: 'القسم غير موجود.', ephemeral: true });
            return;
        }

        const section = sectionsData[guildId].sections[sectionName];
        const roleIndex = section.roles.findIndex(r => r.id === role.id);

        if (roleIndex === -1) {
            await interaction.reply({ content: 'الرتبة غير موجودة في هذا القسم.', ephemeral: true });
            return;
        }

        section.roles.splice(roleIndex, 1);
        fs.writeFileSync(sectionsFilePath, JSON.stringify(sectionsData, null, 2));
        await interaction.reply({ content: `تم حذف الرتبة ${role.name} من القسم ${sectionName} بنجاح.`, ephemeral: true });
    } else if (interaction.commandName === 'section_list') {
        const guildId = interaction.guild.id;

        if (!sectionsData[guildId] || Object.keys(sectionsData[guildId].sections).length === 0) {
            await interaction.reply({ content: 'لا توجد أقسام مسجلة في هذا السيرفر.', ephemeral: true });
            return;
        }

        const embed = new EmbedBuilder()
            .setColor('#3F7FFA')
            .setTitle('قائمة الأقسام')
            .setDescription('هنا قائمة بجميع الأقسام الموجودة في السيرفر.')
            .setFooter({ text: config.footer.text, iconURL: config.footer.iconURL });

        Object.keys(sectionsData[guildId].sections).forEach(sectionName => {
            const section = sectionsData[guildId].sections[sectionName];
            embed.addFields({
                name: sectionName,
                value: `عدد الرتب: ${section.roles.length}`,
                inline: false,
            });
        });

        await interaction.reply({ embeds: [embed], ephemeral: true });
    } else if (interaction.commandName === 'role_list') {
        const guildId = interaction.guild.id;

        if (!sectionsData[guildId] || Object.keys(sectionsData[guildId].sections).length === 0) {
            await interaction.reply({ content: 'لا توجد أقسام مسجلة في هذا السيرفر.', ephemeral: true });
            return;
        }

        const embed = new EmbedBuilder()
            .setColor('#3F7FFA')
            .setTitle('قائمة الرتب')
            .setDescription('هنا قائمة بجميع الأقسام والرتب الموجودة فيها.')
            .setFooter({ text: config.footer.text, iconURL: config.footer.iconURL });

        Object.keys(sectionsData[guildId].sections).forEach(sectionName => {
            const section = sectionsData[guildId].sections[sectionName];
            const rolesList = section.roles.length > 0 ? section.roles.map(role => role.name).join('\n') : 'لا توجد رتب في هذا القسم.';

            embed.addFields({
                name: sectionName,
                value: `${rolesList}`,
                inline: false,
            });
        });

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isSelectMenu()) return;

    const roleId = interaction.values[0];
    const role = interaction.guild.roles.cache.get(roleId);

    try {
        if (role) {
            if (interaction.member.roles.cache.has(roleId)) {
                await interaction.member.roles.remove(role);
                await interaction.reply({ content: `تم ازالة رتبة ${role.name} منك بنجاح`, ephemeral: true });
            } else {
                await interaction.member.roles.add(role);
                await interaction.reply({ content: `تم اعطائك رتبة ${role.name} بنجاح`, ephemeral: true });
            }
        } else {
            await interaction.reply({ content: 'لم يتم العثور على رتبة.', ephemeral: true });
        }
    } catch (error) {
        console.error('Error handling role selection:', error);
        if (!interaction.replied) {
            await interaction.reply({ content: 'There was an error updating your role. Please try again later.', ephemeral: true });
        } else {
            await interaction.followUp({ content: 'There was an error updating your role. Please try again later.', ephemeral: true });
        }
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;
    if (interaction.commandName === 'help') {
        const embed = new EmbedBuilder()
            .setColor('#3F7FFA')
            .setTitle('قائمة الأوامر')
            .setDescription('هنا قائمة بجميع الأوامر المتاحة في البوت:')
            .addFields(
                { name: '/role', value: 'لارسال لوحة التحكم الخاصة بالرتب!', inline: false },
                { name: '/add_section', value: 'إضافة قسم جديد', inline: false },
                { name: '/addrole', value: 'إضافة رتبة إلى قسم معين', inline: false },
                { name: '/delete_section', value: 'حذف قسم وما يحتويه من رتب', inline: false },
                { name: '/remove_role', value: 'حذف رتبة من قسم معين', inline: false },
                { name: '/section_list', value: 'عرض جميع الأقسام في السيرفر', inline: false },
                { name: '/role_list', value: 'عرض جميع الأقسام والرتب الموجودة فيها', inline: false },
                // إضافة أي أوامر أخرى هنا
            )
            .setFooter({ text: config.footer.text, iconURL: config.footer.iconURL });

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
});


client.login(process.env.TOKEN);

process.on('unhandledRejection', (reason, p) => {
    console.log(' [antiCrash] :: Unhandled Rejection/Catch');
    console.log(reason, p);
});
process.on("uncaughtException", (err, origin) => {
    console.log(' [antiCrash] :: Uncaught Exception/Catch');
    console.log(err, origin);
});
process.on('uncaughtExceptionMonitor', (err, origin) => {
    console.log(' [antiCrash] :: Uncaught Exception/Catch (MONITOR)');
    console.log(err, origin);
});
