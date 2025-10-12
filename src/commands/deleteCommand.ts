import * as vscode from 'vscode';
import { CommandItem } from '../models/CommandItem';
import { getCommandList, setCommandList } from '../providers/CommandRunnerViewProvider';

export async function deleteCommand(item: CommandItem, commandProvider: any): Promise<void> {
    const filteredList = getCommandList().filter(cmd => cmd.id !== item.id);
    setCommandList(filteredList);
    await commandProvider.updateWebview();
}