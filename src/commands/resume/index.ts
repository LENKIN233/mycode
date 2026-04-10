import type { Command } from '../../commands.js'

const resume: Command = {
  type: 'local-jsx',
  name: 'resume',
  description: 'Resume a previous conversation',
  aliases: ['continue'],
  argumentHint: '[conversation id or search term | new | delete <id> | info]',
  load: () => import('./resume.js'),
}

export default resume
