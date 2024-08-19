class CreateJIRAPage {
    JIRA;
    DV;
    constructor() {
        // @ts-expect-error
        this.JIRA = app.plugins.plugins['obsidian-jira-issue'].api;
        // @ts-expect-error
        this.DV = app.plugins.plugins['dataview'].api;
    }
    async invoke() {
        console.log("Invoking JIRA");
        await this.createCurrentSprint();
    }
    async createCurrentSprint() {
        const currentSprint = await this.JIRA.macro.getActiveSprint('BEAC');
        console.log({ currentSprint });
        await this.upsertFile('Test');
    }
    async upsertFile(targetFilePath, fileContent) {
        // @ts-ignore
        console.log({ app, window, cjs: await cJS() });
        // const file = await app.vault.getFileByPath(targetFilePath)
        // const exists = !!file
        // if (exists) {
        // return;
        // }
        // console.log("Creating file")
        // const newFile = await app.vault.create(targetFilePath, '## Test')
        // console.log("Created File")
        // console.log({ newFile })
        // const file = app.vault.fileMap['']
        // 
        // @ts-ignore
        await app.vault.modify({}, 'test');
    }
}
