export type DiscoverySignal =
  | {
      type: 'turn_zero'
    }
  | {
      type: 'assistant_turn' | 'subagent_spawn'
      hidden_by_main_turn?: boolean
    }

export function createSkillSearchSignal(
  signal: DiscoverySignal,
): DiscoverySignal {
  return signal
}
