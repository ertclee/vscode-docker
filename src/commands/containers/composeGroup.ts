/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from 'vscode-azureextensionui';
import { localize } from '../../localize';
import { ContainerGroupTreeItem } from '../../tree/containers/ContainerGroupTreeItem';
import { ContainerTreeItem } from '../../tree/containers/ContainerTreeItem';
import { executeAsTask } from '../../utils/executeAsTask';
import { isWindows } from '../../utils/osUtils';
import { rewriteCommandForNewCliIfNeeded } from '../compose';

export async function composeGroupRestart(context: IActionContext, node: ContainerGroupTreeItem): Promise<void> {
    return composeGroup(context, 'restart', node);
}

export async function composeGroupDown(context: IActionContext, node: ContainerGroupTreeItem): Promise<void> {
    return composeGroup(context, 'down', node);
}

async function composeGroup(context: IActionContext, composeCommand: 'restart' | 'down', node: ContainerGroupTreeItem): Promise<void> {
    const workingDirectory = getComposeWorkingDirectory(node);
    const filesArgument = getComposeFiles(node)?.map(f => isWindows() ? `-f "${f}"` : `-f '${f}'`)?.join(' ');

    if (!workingDirectory || !filesArgument) {
        context.errorHandling.suppressReportIssue = true;
        throw new Error(localize('vscode-docker.commands.containers.composeGroup.noCompose', 'Unable to determine compose project info for container group \'{0}\'.', node.label));
    }

    const terminalCommand = `docker-compose ${filesArgument} ${composeCommand}`;

    await executeAsTask(context, await rewriteCommandForNewCliIfNeeded(terminalCommand), 'Docker Compose', { addDockerEnv: true, cwd: workingDirectory, });
}

function getComposeWorkingDirectory(node: ContainerGroupTreeItem): string | undefined {
    // Find a container with the `com.docker.compose.project.working_dir` label, which gives the working directory in which to execute the compose command
    const container = (node.ChildTreeItems as ContainerTreeItem[]).find(c => c.labels?.['com.docker.compose.project.working_dir']);
    return container?.labels?.['com.docker.compose.project.working_dir'];
}

function getComposeFiles(node: ContainerGroupTreeItem): string[] | undefined {
    // Find a container with the `com.docker.compose.project.config_files` label, which gives all the compose files (within the working directory) used to up this container
    const container = (node.ChildTreeItems as ContainerTreeItem[]).find(c => c.labels?.['com.docker.compose.project.config_files']);
    return container?.labels?.['com.docker.compose.project.config_files']?.split(',');
}
