// biome-ignore-all assist/source/organizeImports: ANT-ONLY import markers must not be reordered
import { Box, Text, useTheme, useThemeSetting, useTerminalFocus } from '../../ink.js';
import type { KeyboardEvent } from '../../ink/events/keyboard-event.js';
import * as React from 'react';
import { useState, useCallback } from 'react';
import { useKeybinding, useKeybindings } from '../../keybindings/useKeybinding.js';
import { type GlobalConfig, saveGlobalConfig, getCurrentProjectConfig, type OutputStyle } from '../../utils/config.js';
import { normalizeApiKeyForConfig } from '../../utils/authPortable.js';
import { getGlobalConfig, getAutoUpdaterDisabledReason, formatAutoUpdaterDisabledReason, getRemoteControlAtStartup } from '../../utils/config.js';
import chalk from 'chalk';
import { permissionModeFromString, toExternalPermissionMode, isExternalPermissionMode, EXTERNAL_PERMISSION_MODES, PERMISSION_MODES, type ExternalPermissionMode, type PermissionMode } from '../../utils/permissions/PermissionMode.js';
import { transitionPlanAutoMode } from '../../utils/permissions/permissionSetup.js';
import { logError } from '../../utils/log.js';
import { logEvent, type AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from 'src/services/analytics/index.js';
import { isBridgeEnabled } from '../../bridge/bridgeEnabled.js';
import { useAppState, useSetAppState, useAppStateStore } from '../../state/AppState.js';
import { modelDisplayString, isOpus1mMergeEnabled } from '../../utils/model/model.js';
import { isBilledAsExtraUsage } from '../../utils/extraUsage.js';
import { getExternalMyCodeMdIncludes, getMemoryFiles, hasExternalMyCodeMdIncludes } from 'src/utils/mycodeMd.js';
import { useTabHeaderFocus } from '../design-system/Tabs.js';
import { useIsInsideModal } from '../../context/modalContext.js';
import { isSupportedTerminal, hasAccessToIDEExtensionDiffFeature } from '../../utils/ide.js';
import { getInitialSettings, getSettingsForSource, updateSettingsForSource } from '../../utils/settings/settings.js';
import { getUserMsgOptIn, setUserMsgOptIn } from '../../bootstrap/state.js';
import { DEFAULT_OUTPUT_STYLE_NAME } from 'src/constants/outputStyles.js';
import { isEnvTruthy, isRunningOnHomespace } from 'src/utils/envUtils.js';
import type { LocalJSXCommandContext, CommandResultDisplay } from '../../commands.js';
import { getFeatureValue_CACHED_MAY_BE_STALE } from '../../services/analytics/growthbook.js';
import { isAgentSwarmsEnabled } from '../../utils/agentSwarmsEnabled.js';
import { getCliTeammateModeOverride, clearCliTeammateModeOverride } from '../../utils/swarm/backends/teammateModeSnapshot.js';
import { getHardcodedTeammateModelFallback } from '../../utils/swarm/teammateModel.js';
import { useSearchInput } from '../../hooks/useSearchInput.js';
import { useTerminalSize } from '../../hooks/useTerminalSize.js';
import { clearFastModeCooldown, FAST_MODE_MODEL_DISPLAY, isFastModeAvailable, isFastModeEnabled, getFastModeModel, isFastModeSupportedByModel } from '../../utils/fastMode.js';
import { isFullscreenEnvEnabled } from '../../utils/fullscreen.js';
import { getDisplaySettingsItems } from './displaySettings.js';
import {
  isBasicConfigSubMenu,
  renderBasicConfigSubMenu,
} from './basicConfigSubmenus.js';
import {
  getProviderRoutingSettingsItems,
  isProviderRoutingSubMenu,
  renderProviderRoutingSubMenu,
} from './providerRoutingSettings.js';
import { ConfigListView } from './configListView.js';
import { renderConfigSpecialSubMenu } from './configSpecialSubmenus.js';
import type { Setting } from './types.js';
type Props = {
  onClose: (result?: string, options?: {
    display?: CommandResultDisplay;
  }) => void;
  context: LocalJSXCommandContext;
  setTabsHidden: (hidden: boolean) => void;
  onIsSearchModeChange?: (inSearchMode: boolean) => void;
  contentHeight?: number;
};
type SubMenu = 'Theme' | 'Model' | 'Provider' | 'TaskRouting' | 'TeammateModel' | 'ExternalIncludes' | 'OutputStyle' | 'ChannelDowngrade' | 'Language' | 'EnableAutoUpdates';
const MANAGED_SETTING_SUBMENUS: Record<string, SubMenu> = {
  theme: 'Theme',
  model: 'Model',
  provider: 'Provider',
  taskRouting: 'TaskRouting',
  teammateDefaultModel: 'TeammateModel',
  showExternalIncludesDialog: 'ExternalIncludes',
  outputStyle: 'OutputStyle',
  language: 'Language',
};
export function Config({
  onClose,
  context,
  setTabsHidden,
  onIsSearchModeChange,
  contentHeight
}: Props): React.ReactNode {
  const {
    headerFocused,
    focusHeader
  } = useTabHeaderFocus();
  const insideModal = useIsInsideModal();
  const [, setTheme] = useTheme();
  const themeSetting = useThemeSetting();
  const [globalConfig, setGlobalConfig] = useState(getGlobalConfig());
  const initialConfig = React.useRef(getGlobalConfig());
  const [settingsData, setSettingsData] = useState(getInitialSettings());
  const initialSettingsData = React.useRef(getInitialSettings());
  const [currentOutputStyle, setCurrentOutputStyle] = useState<OutputStyle>(settingsData?.outputStyle || DEFAULT_OUTPUT_STYLE_NAME);
  const initialOutputStyle = React.useRef(currentOutputStyle);
  const [currentLanguage, setCurrentLanguage] = useState<string | undefined>(settingsData?.language);
  const initialLanguage = React.useRef(currentLanguage);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [isSearchMode, setIsSearchMode] = useState(true);
  const isTerminalFocused = useTerminalFocus();
  const {
    rows
  } = useTerminalSize();
  // contentHeight is set by Settings.tsx (same value passed to Tabs to fix
  // pane height across all tabs — prevents layout jank when switching).
  // Reserve ~10 rows for chrome (search box, gaps, footer, scroll hints).
  // Fallback calc for standalone rendering (tests).
  const paneCap = contentHeight ?? Math.min(Math.floor(rows * 0.8), 30);
  const maxVisible = Math.max(5, paneCap - 10);
  const mainLoopModel = useAppState(s => s.mainLoopModel);
  const verbose = useAppState(s_0 => s_0.verbose);
  const thinkingEnabled = useAppState(s_1 => s_1.thinkingEnabled);
  const isFastMode = useAppState(s_2 => isFastModeEnabled() ? s_2.fastMode : false);
  const promptSuggestionEnabled = useAppState(s_3 => s_3.promptSuggestionEnabled);
  // Show auto in the default-mode dropdown when the user has opted in OR the
  // config is fully 'enabled' — even if currently circuit-broken ('disabled'),
  // an opted-in user should still see it in settings (it's a temporary state).
  const showAutoInDefaultModePicker = false;
  // Chat/Transcript view picker is visible to entitled users (pass the GB
  // gate) even if they haven't opted in this session — it IS the persistent
  // opt-in. 'chat' written here is read at next startup by main.tsx which
  // sets userMsgOptIn if still entitled.
  const showDefaultViewPicker = false;
  const setAppState = useSetAppState();
  const [changes, setChanges] = useState<{
    [key: string]: unknown;
  }>({});
  const initialThinkingEnabled = React.useRef(thinkingEnabled);
  // Per-source settings snapshots for revert-on-escape. getInitialSettings()
  // returns merged-across-sources which can't tell us what to delete vs
  // restore; per-source snapshots + updateSettingsForSource's
  // undefined-deletes-key semantics can. Lazy-init via useState (no setter) to
  // avoid reading settings files on every render — useRef evaluates its arg
  // eagerly even though only the first result is kept.
  const [initialLocalSettings] = useState(() => getSettingsForSource('localSettings'));
  const [initialUserSettings] = useState(() => getSettingsForSource('userSettings'));
  const initialThemeSetting = React.useRef(themeSetting);
  // AppState fields Config may modify — snapshot once at mount.
  const store = useAppStateStore();
  const [initialAppState] = useState(() => {
    const s_4 = store.getState();
    return {
      mainLoopModel: s_4.mainLoopModel,
      mainLoopModelForSession: s_4.mainLoopModelForSession,
      verbose: s_4.verbose,
      thinkingEnabled: s_4.thinkingEnabled,
      fastMode: s_4.fastMode,
      promptSuggestionEnabled: s_4.promptSuggestionEnabled,
      isBriefOnly: s_4.isBriefOnly,
      replBridgeEnabled: s_4.replBridgeEnabled,
      replBridgeOutboundOnly: s_4.replBridgeOutboundOnly,
      settings: s_4.settings
    };
  });
  // Bootstrap state snapshot — userMsgOptIn is outside AppState, so
  // revertChanges needs to restore it separately. Without this, cycling
  // defaultView to 'chat' then Escape leaves the tool active while the
  // display filter reverts — the exact ambient-activation behavior this
  // PR's entitlement/opt-in split is meant to prevent.
  const [initialUserMsgOptIn] = useState(() => getUserMsgOptIn());
  // Set on first user-visible change; gates revertChanges() on Escape so
  // opening-then-closing doesn't trigger redundant disk writes.
  const isDirty = React.useRef(false);
  const [showThinkingWarning, setShowThinkingWarning] = useState(false);
  const [showSubmenu, setShowSubmenu] = useState<SubMenu | null>(null);
  const {
    query: searchQuery,
    setQuery: setSearchQuery,
    cursorOffset: searchCursorOffset
  } = useSearchInput({
    isActive: isSearchMode && showSubmenu === null && !headerFocused,
    onExit: () => setIsSearchMode(false),
    onExitUp: focusHeader,
    // Ctrl+C/D must reach Settings' useExitOnCtrlCD; 'd' also avoids
    // double-action (delete-char + exit-pending).
    passthroughCtrlKeys: ['c', 'd']
  });

  // Tell the parent when Config's own Esc handler is active so Settings cedes
  // confirm:no. Only true when search mode owns the keyboard — not when the
  // tab header is focused (then Settings must handle Esc-to-close).
  const ownsEsc = isSearchMode && !headerFocused;
  React.useEffect(() => {
    onIsSearchModeChange?.(ownsEsc);
  }, [ownsEsc, onIsSearchModeChange]);
  const isConnectedToIde = hasAccessToIDEExtensionDiffFeature(context.options.mcpClients);
  const isFileCheckpointingAvailable = !isEnvTruthy(process.env.MYCODE_DISABLE_FILE_CHECKPOINTING);
  const memoryFiles = React.use(getMemoryFiles(true));
  const shouldShowExternalIncludesToggle = hasExternalMyCodeMdIncludes(memoryFiles);
  const autoUpdaterDisabledReason = getAutoUpdaterDisabledReason();
  const closeSubmenu = useCallback(() => {
    setShowSubmenu(null);
    setTabsHidden(false);
  }, [setTabsHidden]);
  const openSubmenu = useCallback((submenu: SubMenu) => {
    setShowSubmenu(submenu);
    setTabsHidden(true);
  }, [setTabsHidden]);
  function onChangeMainModelConfig(value: string | null): void {
    const previousModel = mainLoopModel;
    logEvent('tengu_config_model_changed', {
      from_model: previousModel as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
      to_model: value as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
    });
    setAppState(prev => ({
      ...prev,
      mainLoopModel: value,
      mainLoopModelForSession: null
    }));
    setChanges(prev_0 => {
      const valStr = modelDisplayString(value) + (isBilledAsExtraUsage(value, false, isOpus1mMergeEnabled()) ? ' · Billed as extra usage' : '');
      if ('model' in prev_0) {
        const {
          model,
          ...rest
        } = prev_0;
        return {
          ...rest,
          model: valStr
        };
      }
      return {
        ...prev_0,
        model: valStr
      };
    });
  }
  function onChangeVerbose(value_0: boolean): void {
    // Update the global config to persist the setting
    saveGlobalConfig(current => ({
      ...current,
      verbose: value_0
    }));
    setGlobalConfig({
      ...getGlobalConfig(),
      verbose: value_0
    });

    // Update the app state for immediate UI feedback
    setAppState(prev_1 => ({
      ...prev_1,
      verbose: value_0
    }));
    setChanges(prev_2 => {
      if ('verbose' in prev_2) {
        const {
          verbose: verbose_0,
          ...rest_0
        } = prev_2;
        return rest_0;
      }
      return {
        ...prev_2,
        verbose: value_0
      };
    });
  }

  // TODO: Add MCP servers
  const displaySettingsItems = getDisplaySettingsItems({
    globalConfig,
    setGlobalConfig,
    settingsData,
    setSettingsData,
    setAppState,
    themeSetting,
    currentOutputStyle,
    currentLanguage,
    verbose,
    onChangeVerbose,
    showTerminalSidebarSetting: getFeatureValue_CACHED_MAY_BE_STALE('tengu_terminal_sidebar', false),
    fullscreenCopyOnSelectAvailable: isFullscreenEnvEnabled(),
  });
  const providerRoutingItems = getProviderRoutingSettingsItems();
  const settingsItems: Setting[] = [
  // Global settings
  {
    id: 'autoCompactEnabled',
    label: 'Auto-compact',
    value: globalConfig.autoCompactEnabled,
    type: 'boolean' as const,
    onChange(autoCompactEnabled: boolean) {
      saveGlobalConfig(current_0 => ({
        ...current_0,
        autoCompactEnabled
      }));
      setGlobalConfig({
        ...getGlobalConfig(),
        autoCompactEnabled
      });
      logEvent('tengu_auto_compact_setting_changed', {
        enabled: autoCompactEnabled
      });
    }
  }, {
    id: 'spinnerTipsEnabled',
    label: 'Show tips',
    value: settingsData?.spinnerTipsEnabled ?? true,
    type: 'boolean' as const,
    onChange(spinnerTipsEnabled: boolean) {
      updateSettingsForSource('localSettings', {
        spinnerTipsEnabled
      });
      // Update local state to reflect the change immediately
      setSettingsData(prev_3 => ({
        ...prev_3,
        spinnerTipsEnabled
      }));
      logEvent('tengu_tips_setting_changed', {
        enabled: spinnerTipsEnabled
      });
    }
  }, {
    id: 'prefersReducedMotion',
    label: 'Reduce motion',
    value: settingsData?.prefersReducedMotion ?? false,
    type: 'boolean' as const,
    onChange(prefersReducedMotion: boolean) {
      updateSettingsForSource('localSettings', {
        prefersReducedMotion
      });
      setSettingsData(prev_4 => ({
        ...prev_4,
        prefersReducedMotion
      }));
      // Sync to AppState so components react immediately
      setAppState(prev_5 => ({
        ...prev_5,
        settings: {
          ...prev_5.settings,
          prefersReducedMotion
        }
      }));
      logEvent('tengu_reduce_motion_setting_changed', {
        enabled: prefersReducedMotion
      });
    }
  }, {
    id: 'thinkingEnabled',
    label: 'Thinking mode',
    value: thinkingEnabled ?? true,
    type: 'boolean' as const,
    onChange(enabled: boolean) {
      setAppState(prev_6 => ({
        ...prev_6,
        thinkingEnabled: enabled
      }));
      updateSettingsForSource('userSettings', {
        alwaysThinkingEnabled: enabled ? undefined : false
      });
      logEvent('tengu_thinking_toggled', {
        enabled
      });
    }
  },
  // Fast mode toggle (ant-only, eliminated from external builds)
  ...(isFastModeEnabled() && isFastModeAvailable() ? [{
    id: 'fastMode',
    label: `Fast mode (${FAST_MODE_MODEL_DISPLAY} only)`,
    value: !!isFastMode,
    type: 'boolean' as const,
    onChange(enabled_0: boolean) {
      clearFastModeCooldown();
      updateSettingsForSource('userSettings', {
        fastMode: enabled_0 ? true : undefined
      });
      if (enabled_0) {
        setAppState(prev_7 => ({
          ...prev_7,
          mainLoopModel: getFastModeModel(),
          mainLoopModelForSession: null,
          fastMode: true
        }));
        setChanges(prev_8 => ({
          ...prev_8,
          model: getFastModeModel(),
          'Fast mode': 'ON'
        }));
      } else {
        setAppState(prev_9 => ({
          ...prev_9,
          fastMode: false
        }));
        setChanges(prev_10 => ({
          ...prev_10,
          'Fast mode': 'OFF'
        }));
      }
    }
  }] : []), ...(getFeatureValue_CACHED_MAY_BE_STALE('tengu_chomp_inflection', false) ? [{
    id: 'promptSuggestionEnabled',
    label: 'Prompt suggestions',
    value: promptSuggestionEnabled,
    type: 'boolean' as const,
    onChange(enabled_1: boolean) {
      setAppState(prev_11 => ({
        ...prev_11,
        promptSuggestionEnabled: enabled_1
      }));
      updateSettingsForSource('userSettings', {
        promptSuggestionEnabled: enabled_1 ? undefined : false
      });
    }
  }] : []),
  ...(isFileCheckpointingAvailable ? [{
    id: 'fileCheckpointingEnabled',
    label: 'Rewind code (checkpoints)',
    value: globalConfig.fileCheckpointingEnabled,
    type: 'boolean' as const,
    onChange(enabled_3: boolean) {
      saveGlobalConfig(current_2 => ({
        ...current_2,
        fileCheckpointingEnabled: enabled_3
      }));
      setGlobalConfig({
        ...getGlobalConfig(),
        fileCheckpointingEnabled: enabled_3
      });
      logEvent('tengu_file_history_snapshots_setting_changed', {
        enabled: enabled_3
      });
    }
  }] : []), {
  }, {
    id: 'defaultPermissionMode',
    label: 'Default permission mode',
    value: settingsData?.permissions?.defaultMode || 'default',
    options: (() => {
      const priorityOrder: PermissionMode[] = ['default', 'plan'];
      const allModes: readonly PermissionMode[] = EXTERNAL_PERMISSION_MODES;
      const excluded: PermissionMode[] = ['bypassPermissions'];
      if (!showAutoInDefaultModePicker) {
        excluded.push('auto');
      }
      return [...priorityOrder, ...allModes.filter(m => !priorityOrder.includes(m) && !excluded.includes(m))];
    })(),
    type: 'enum' as const,
    onChange(mode: string) {
      const parsedMode = permissionModeFromString(mode);
      // Internal modes (e.g. auto) are stored directly
      const validatedMode = isExternalPermissionMode(parsedMode) ? toExternalPermissionMode(parsedMode) : parsedMode;
      const result = updateSettingsForSource('userSettings', {
        permissions: {
          ...settingsData?.permissions,
          defaultMode: validatedMode as ExternalPermissionMode
        }
      });
      if (result.error) {
        logError(result.error);
        return;
      }

      // Update local state to reflect the change immediately.
      // validatedMode is typed as the wide PermissionMode union but at
      // runtime is always a PERMISSION_MODES member (the options dropdown
      // is built from that array above), so this narrowing is sound.
      setSettingsData(prev_12 => ({
        ...prev_12,
        permissions: {
          ...prev_12?.permissions,
          defaultMode: validatedMode as (typeof PERMISSION_MODES)[number]
        }
      }));
      // Track changes
      setChanges(prev_13 => ({
        ...prev_13,
        defaultPermissionMode: mode
      }));
      logEvent('tengu_config_changed', {
        setting: 'defaultPermissionMode' as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
        value: mode as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
      });
    }
  }, ...(showAutoInDefaultModePicker ? [{
    id: 'useAutoModeDuringPlan',
    label: 'Use auto mode during plan',
    value: (settingsData as {
      useAutoModeDuringPlan?: boolean;
    } | undefined)?.useAutoModeDuringPlan ?? true,
    type: 'boolean' as const,
    onChange(useAutoModeDuringPlan: boolean) {
      updateSettingsForSource('userSettings', {
        useAutoModeDuringPlan
      });
      setSettingsData(prev_14 => ({
        ...prev_14,
        useAutoModeDuringPlan
      }));
      // Internal writes suppress the file watcher, so
      // applySettingsChange won't fire. Reconcile directly so
      // mid-plan toggles take effect immediately.
      setAppState(prev_15 => {
        const next = transitionPlanAutoMode(prev_15.toolPermissionContext);
        if (next === prev_15.toolPermissionContext) return prev_15;
        return {
          ...prev_15,
          toolPermissionContext: next
        };
      });
      setChanges(prev_16 => ({
        ...prev_16,
        'Use auto mode during plan': useAutoModeDuringPlan
      }));
    }
  }] : []), {
    id: 'respectGitignore',
    label: 'Respect .gitignore in file picker',
    value: globalConfig.respectGitignore,
    type: 'boolean' as const,
    onChange(respectGitignore: boolean) {
      saveGlobalConfig(current_6 => ({
        ...current_6,
        respectGitignore
      }));
      setGlobalConfig({
        ...getGlobalConfig(),
        respectGitignore
      });
      logEvent('tengu_respect_gitignore_setting_changed', {
        enabled: respectGitignore
      });
    }
  },
  // autoUpdates setting is hidden - use DISABLE_AUTOUPDATER env var to control
  autoUpdaterDisabledReason ? {
    id: 'autoUpdatesChannel',
    label: 'Auto-update channel',
    value: 'disabled',
    type: 'managedEnum' as const,
    onChange() {}
  } : {
    id: 'autoUpdatesChannel',
    label: 'Auto-update channel',
    value: settingsData?.autoUpdatesChannel ?? 'latest',
    type: 'managedEnum' as const,
    onChange() {
      // Handled via toggleSetting -> 'ChannelDowngrade'
    }
  }, ...providerRoutingItems, ...displaySettingsItems, ...(showDefaultViewPicker ? [{
    id: 'defaultView',
    label: 'What you see by default',
    // 'default' means the setting is unset — currently resolves to
    // transcript (main.tsx falls through when defaultView !== 'chat').
    // String() narrows the conditional-schema-spread union to string.
    value: settingsData?.defaultView === undefined ? 'default' : String(settingsData.defaultView),
    options: ['transcript', 'chat', 'default'],
    type: 'enum' as const,
    onChange(selected: string) {
      const defaultView = selected === 'default' ? undefined : selected as 'chat' | 'transcript';
      updateSettingsForSource('localSettings', {
        defaultView
      });
      setSettingsData(prev_17 => ({
        ...prev_17,
        defaultView
      }));
      const nextBrief = defaultView === 'chat';
      setAppState(prev_18 => {
        if (prev_18.isBriefOnly === nextBrief) return prev_18;
        return {
          ...prev_18,
          isBriefOnly: nextBrief
        };
      });
      // Keep userMsgOptIn in sync so the tool list follows the view.
      // Two-way now (same as /brief) — accepting a cache invalidation
      // is better than leaving the tool on after switching away.
      // Reverted on Escape via initialUserMsgOptIn snapshot.
      setUserMsgOptIn(nextBrief);
      setChanges(prev_19 => ({
        ...prev_19,
        'Default view': selected
      }));
      logEvent('tengu_default_view_setting_changed', {
        value: (defaultView ?? 'unset') as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
      });
    }
  }] : []), {
    id: 'prStatusFooterEnabled',
    label: 'Show PR status footer',
    value: globalConfig.prStatusFooterEnabled ?? true,
    type: 'boolean' as const,
    onChange(enabled_4: boolean) {
      saveGlobalConfig(current_14 => {
        if (current_14.prStatusFooterEnabled === enabled_4) return current_14;
        return {
          ...current_14,
          prStatusFooterEnabled: enabled_4
        };
      });
      setGlobalConfig({
        ...getGlobalConfig(),
        prStatusFooterEnabled: enabled_4
      });
      logEvent('tengu_pr_status_footer_setting_changed', {
        enabled: enabled_4
      });
    }
  }, {
    id: 'model',
    label: 'Model',
    value: mainLoopModel === null ? 'Default (recommended)' : mainLoopModel,
    type: 'managedEnum' as const,
    onChange: onChangeMainModelConfig
  }, ...(isConnectedToIde ? [{
    id: 'diffTool',
    label: 'Diff tool',
    value: globalConfig.diffTool ?? 'auto',
    options: ['terminal', 'auto'],
    type: 'enum' as const,
    onChange(diffTool: string) {
      saveGlobalConfig(current_15 => ({
        ...current_15,
        diffTool: diffTool as GlobalConfig['diffTool']
      }));
      setGlobalConfig({
        ...getGlobalConfig(),
        diffTool: diffTool as GlobalConfig['diffTool']
      });
      logEvent('tengu_diff_tool_changed', {
        tool: diffTool as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
        source: 'config_panel' as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
      });
    }
  }] : []), ...(!isSupportedTerminal() ? [{
    id: 'autoConnectIde',
    label: 'Auto-connect to IDE (external terminal)',
    value: globalConfig.autoConnectIde ?? false,
    type: 'boolean' as const,
    onChange(autoConnectIde: boolean) {
      saveGlobalConfig(current_16 => ({
        ...current_16,
        autoConnectIde
      }));
      setGlobalConfig({
        ...getGlobalConfig(),
        autoConnectIde
      });
      logEvent('tengu_auto_connect_ide_changed', {
        enabled: autoConnectIde,
        source: 'config_panel' as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
      });
    }
  }] : []), ...(isSupportedTerminal() ? [{
    id: 'autoInstallIdeExtension',
    label: 'Auto-install IDE extension',
    value: globalConfig.autoInstallIdeExtension ?? true,
    type: 'boolean' as const,
    onChange(autoInstallIdeExtension: boolean) {
      saveGlobalConfig(current_17 => ({
        ...current_17,
        autoInstallIdeExtension
      }));
      setGlobalConfig({
        ...getGlobalConfig(),
        autoInstallIdeExtension
      });
      logEvent('tengu_auto_install_ide_extension_changed', {
        enabled: autoInstallIdeExtension,
        source: 'config_panel' as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
      });
    }
  }] : []), {
    id: 'myCodeInChromeDefaultEnabled',
    label: 'Browser Extension enabled by default',
    value: globalConfig.myCodeInChromeDefaultEnabled ?? true,
    type: 'boolean' as const,
    onChange(enabled_5: boolean) {
      saveGlobalConfig(current_18 => ({
        ...current_18,
        myCodeInChromeDefaultEnabled: enabled_5
      }));
      setGlobalConfig({
        ...getGlobalConfig(),
        myCodeInChromeDefaultEnabled: enabled_5
      });
      logEvent('tengu_mycode_in_chrome_setting_changed', {
        enabled: enabled_5
      });
    }
  },
  // Teammate mode (only shown when agent swarms are enabled)
  ...(isAgentSwarmsEnabled() ? (() => {
    const cliOverride = getCliTeammateModeOverride();
    const label = cliOverride ? `Teammate mode [overridden: ${cliOverride}]` : 'Teammate mode';
    return [{
      id: 'teammateMode',
      label,
      value: globalConfig.teammateMode ?? 'auto',
      options: ['auto', 'tmux', 'in-process'],
      type: 'enum' as const,
      onChange(mode_0: string) {
        if (mode_0 !== 'auto' && mode_0 !== 'tmux' && mode_0 !== 'in-process') {
          return;
        }
        // Clear CLI override and set new mode (pass mode to avoid race condition)
        clearCliTeammateModeOverride(mode_0);
        saveGlobalConfig(current_19 => ({
          ...current_19,
          teammateMode: mode_0
        }));
        setGlobalConfig({
          ...getGlobalConfig(),
          teammateMode: mode_0
        });
        logEvent('tengu_teammate_mode_changed', {
          mode: mode_0 as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
        });
      }
    }, {
      id: 'teammateDefaultModel',
      label: 'Default teammate model',
      value: teammateModelDisplayString(globalConfig.teammateDefaultModel),
      type: 'managedEnum' as const,
      onChange() {}
    }];
  })() : []),
  ...(shouldShowExternalIncludesToggle ? [{
    id: 'showExternalIncludesDialog',
    label: 'External MYCODE.md includes',
    value: (() => {
      const projectConfig = getCurrentProjectConfig();
      if (projectConfig.hasMyCodeMdExternalIncludesApproved) {
        return 'true';
      } else {
        return 'false';
      }
    })(),
    type: 'managedEnum' as const,
    onChange() {
      // Will be handled by toggleSetting function
    }
  }] : []), ...(process.env.ANTHROPIC_API_KEY && !isRunningOnHomespace() ? [{
    id: 'apiKey',
    label: <Text>
                Use custom API key:{' '}
                <Text bold>
                  {normalizeApiKeyForConfig(process.env.ANTHROPIC_API_KEY)}
                </Text>
              </Text>,
    searchText: 'Use custom API key',
    value: Boolean(process.env.ANTHROPIC_API_KEY && globalConfig.customApiKeyResponses?.approved?.includes(normalizeApiKeyForConfig(process.env.ANTHROPIC_API_KEY))),
    type: 'boolean' as const,
    onChange(useCustomKey: boolean) {
      saveGlobalConfig(current_22 => {
        const updated = {
          ...current_22
        };
        if (!updated.customApiKeyResponses) {
          updated.customApiKeyResponses = {
            approved: [],
            rejected: []
          };
        }
        if (!updated.customApiKeyResponses.approved) {
          updated.customApiKeyResponses = {
            ...updated.customApiKeyResponses,
            approved: []
          };
        }
        if (!updated.customApiKeyResponses.rejected) {
          updated.customApiKeyResponses = {
            ...updated.customApiKeyResponses,
            rejected: []
          };
        }
        if (process.env.ANTHROPIC_API_KEY) {
          const truncatedKey = normalizeApiKeyForConfig(process.env.ANTHROPIC_API_KEY);
          if (useCustomKey) {
            updated.customApiKeyResponses = {
              ...updated.customApiKeyResponses,
              approved: [...(updated.customApiKeyResponses.approved ?? []).filter(k => k !== truncatedKey), truncatedKey],
              rejected: (updated.customApiKeyResponses.rejected ?? []).filter(k_0 => k_0 !== truncatedKey)
            };
          } else {
            updated.customApiKeyResponses = {
              ...updated.customApiKeyResponses,
              approved: (updated.customApiKeyResponses.approved ?? []).filter(k_1 => k_1 !== truncatedKey),
              rejected: [...(updated.customApiKeyResponses.rejected ?? []).filter(k_2 => k_2 !== truncatedKey), truncatedKey]
            };
          }
        }
        return updated;
      });
      setGlobalConfig(getGlobalConfig());
    }
  }] : [])];

  // Filter settings based on search query
  const filteredSettingsItems = React.useMemo(() => {
    if (!searchQuery) return settingsItems;
    const lowerQuery = searchQuery.toLowerCase();
    return settingsItems.filter(setting => {
      if (setting.id.toLowerCase().includes(lowerQuery)) return true;
      const searchableText = 'searchText' in setting ? setting.searchText : setting.label;
      return searchableText.toLowerCase().includes(lowerQuery);
    });
  }, [settingsItems, searchQuery]);

  // Adjust selected index when filtered list shrinks, and keep the selected
  // item visible when maxVisible changes (e.g., terminal resize).
  React.useEffect(() => {
    if (selectedIndex >= filteredSettingsItems.length) {
      const newIndex = Math.max(0, filteredSettingsItems.length - 1);
      setSelectedIndex(newIndex);
      setScrollOffset(Math.max(0, newIndex - maxVisible + 1));
      return;
    }
    setScrollOffset(prev_21 => {
      if (selectedIndex < prev_21) return selectedIndex;
      if (selectedIndex >= prev_21 + maxVisible) return selectedIndex - maxVisible + 1;
      return prev_21;
    });
  }, [filteredSettingsItems.length, selectedIndex, maxVisible]);

  // Keep the selected item visible within the scroll window.
  // Called synchronously from navigation handlers to avoid a render frame
  // where the selected item falls outside the visible window.
  const adjustScrollOffset = useCallback((newIndex_0: number) => {
    setScrollOffset(prev_22 => {
      if (newIndex_0 < prev_22) return newIndex_0;
      if (newIndex_0 >= prev_22 + maxVisible) return newIndex_0 - maxVisible + 1;
      return prev_22;
    });
  }, [maxVisible]);

  // Enter: keep all changes (already persisted by onChange handlers), close
  // with a summary of what changed.
  const handleSaveAndClose = useCallback(() => {
    // Submenu handling: each submenu has its own Enter/Esc — don't close
    // the whole panel while one is open.
    if (showSubmenu !== null) {
      return;
    }
    // Log any changes that were made
    // TODO: Make these proper messages
    const formattedChanges: string[] = Object.entries(changes).map(([key, value_2]) => {
      logEvent('tengu_config_changed', {
        key: key as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
        value: value_2 as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
      });
      return `Set ${key} to ${chalk.bold(value_2)}`;
    });
    // Check for API key changes
    // On homespace, ANTHROPIC_API_KEY is preserved in process.env for child
    // processes but ignored by MyCode itself (see auth.ts).
    const effectiveApiKey = isRunningOnHomespace() ? undefined : process.env.ANTHROPIC_API_KEY;
    const initialUsingCustomKey = Boolean(effectiveApiKey && initialConfig.current.customApiKeyResponses?.approved?.includes(normalizeApiKeyForConfig(effectiveApiKey)));
    const currentUsingCustomKey = Boolean(effectiveApiKey && globalConfig.customApiKeyResponses?.approved?.includes(normalizeApiKeyForConfig(effectiveApiKey)));
    if (initialUsingCustomKey !== currentUsingCustomKey) {
      formattedChanges.push(`${currentUsingCustomKey ? 'Enabled' : 'Disabled'} custom API key`);
      logEvent('tengu_config_changed', {
        key: 'env.ANTHROPIC_API_KEY' as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
        value: currentUsingCustomKey as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
      });
    }
    if (globalConfig.theme !== initialConfig.current.theme) {
      formattedChanges.push(`Set theme to ${chalk.bold(globalConfig.theme)}`);
    }
    if (globalConfig.preferredNotifChannel !== initialConfig.current.preferredNotifChannel) {
      formattedChanges.push(`Set notifications to ${chalk.bold(globalConfig.preferredNotifChannel)}`);
    }
    if (currentOutputStyle !== initialOutputStyle.current) {
      formattedChanges.push(`Set output style to ${chalk.bold(currentOutputStyle)}`);
    }
    if (currentLanguage !== initialLanguage.current) {
      formattedChanges.push(`Set response language to ${chalk.bold(currentLanguage ?? 'Default (English)')}`);
    }
    if (globalConfig.editorMode !== initialConfig.current.editorMode) {
      formattedChanges.push(`Set editor mode to ${chalk.bold(globalConfig.editorMode || 'emacs')}`);
    }
    if (globalConfig.diffTool !== initialConfig.current.diffTool) {
      formattedChanges.push(`Set diff tool to ${chalk.bold(globalConfig.diffTool)}`);
    }
    if (globalConfig.autoConnectIde !== initialConfig.current.autoConnectIde) {
      formattedChanges.push(`${globalConfig.autoConnectIde ? 'Enabled' : 'Disabled'} auto-connect to IDE`);
    }
    if (globalConfig.autoInstallIdeExtension !== initialConfig.current.autoInstallIdeExtension) {
      formattedChanges.push(`${globalConfig.autoInstallIdeExtension ? 'Enabled' : 'Disabled'} auto-install IDE extension`);
    }
    if (globalConfig.autoCompactEnabled !== initialConfig.current.autoCompactEnabled) {
      formattedChanges.push(`${globalConfig.autoCompactEnabled ? 'Enabled' : 'Disabled'} auto-compact`);
    }
    if (globalConfig.respectGitignore !== initialConfig.current.respectGitignore) {
      formattedChanges.push(`${globalConfig.respectGitignore ? 'Enabled' : 'Disabled'} respect .gitignore in file picker`);
    }
    if (globalConfig.copyFullResponse !== initialConfig.current.copyFullResponse) {
      formattedChanges.push(`${globalConfig.copyFullResponse ? 'Enabled' : 'Disabled'} always copy full response`);
    }
    if (globalConfig.copyOnSelect !== initialConfig.current.copyOnSelect) {
      formattedChanges.push(`${globalConfig.copyOnSelect ? 'Enabled' : 'Disabled'} copy on select`);
    }
    if (globalConfig.terminalProgressBarEnabled !== initialConfig.current.terminalProgressBarEnabled) {
      formattedChanges.push(`${globalConfig.terminalProgressBarEnabled ? 'Enabled' : 'Disabled'} terminal progress bar`);
    }
    if (globalConfig.showStatusInTerminalTab !== initialConfig.current.showStatusInTerminalTab) {
      formattedChanges.push(`${globalConfig.showStatusInTerminalTab ? 'Enabled' : 'Disabled'} terminal tab status`);
    }
    if (globalConfig.showTurnDuration !== initialConfig.current.showTurnDuration) {
      formattedChanges.push(`${globalConfig.showTurnDuration ? 'Enabled' : 'Disabled'} turn duration`);
    }
    if (globalConfig.remoteControlAtStartup !== initialConfig.current.remoteControlAtStartup) {
      const remoteLabel = globalConfig.remoteControlAtStartup === undefined ? 'Reset Remote Control to default' : `${globalConfig.remoteControlAtStartup ? 'Enabled' : 'Disabled'} Remote Control for all sessions`;
      formattedChanges.push(remoteLabel);
    }
    if (settingsData?.autoUpdatesChannel !== initialSettingsData.current?.autoUpdatesChannel) {
      formattedChanges.push(`Set auto-update channel to ${chalk.bold(settingsData?.autoUpdatesChannel ?? 'latest')}`);
    }
    if (formattedChanges.length > 0) {
      onClose(formattedChanges.join('\n'));
    } else {
      onClose('Config dialog dismissed', {
        display: 'system'
      });
    }
  }, [showSubmenu, changes, globalConfig, mainLoopModel, currentOutputStyle, currentLanguage, settingsData?.autoUpdatesChannel, isFastModeEnabled() ? (settingsData as Record<string, unknown> | undefined)?.fastMode : undefined, onClose]);

  // Restore all state stores to their mount-time snapshots. Changes are
  // applied to disk/AppState immediately on toggle, so "cancel" means
  // actively writing the old values back.
  const revertChanges = useCallback(() => {
    // Theme: restores ThemeProvider React state. Must run before the global
    // config overwrite since setTheme internally calls saveGlobalConfig with
    // a partial update — we want the full snapshot to be the last write.
    if (themeSetting !== initialThemeSetting.current) {
      setTheme(initialThemeSetting.current);
    }
    // Global config: full overwrite from snapshot. saveGlobalConfig skips if
    // the returned ref equals current (test mode checks ref; prod writes to
    // disk but content is identical).
    saveGlobalConfig(() => initialConfig.current);
    // Settings files: restore each key Config may have touched. undefined
    // deletes the key (updateSettingsForSource customizer at settings.ts:368).
    const il = initialLocalSettings;
    updateSettingsForSource('localSettings', {
      spinnerTipsEnabled: il?.spinnerTipsEnabled,
      prefersReducedMotion: il?.prefersReducedMotion,
      defaultView: il?.defaultView,
      outputStyle: il?.outputStyle
    });
    const iu = initialUserSettings;
    updateSettingsForSource('userSettings', {
      alwaysThinkingEnabled: iu?.alwaysThinkingEnabled,
      fastMode: iu?.fastMode,
      promptSuggestionEnabled: iu?.promptSuggestionEnabled,
      autoUpdatesChannel: iu?.autoUpdatesChannel,
      minimumVersion: iu?.minimumVersion,
      language: iu?.language,
      useAutoModeDuringPlan: (iu as {
        useAutoModeDuringPlan?: boolean;
      } | undefined)?.useAutoModeDuringPlan,
      // ThemePicker's Ctrl+T writes this key directly — include it so the
      // disk state reverts along with the in-memory AppState.settings restore.
      syntaxHighlightingDisabled: iu?.syntaxHighlightingDisabled,
      // permissions: the defaultMode onChange (above) spreads the MERGED
      // settingsData.permissions into userSettings — project/policy allow/deny
      // arrays can leak to disk. Spread the full initial snapshot so the
      // mergeWith array-customizer (settings.ts:375) replaces leaked arrays.
      // Explicitly include defaultMode so undefined triggers the customizer's
      // delete path even when iu.permissions lacks that key.
      permissions: iu?.permissions === undefined ? undefined : {
        ...iu.permissions,
        defaultMode: iu.permissions.defaultMode
      }
    });
    // AppState: batch-restore all possibly-touched fields.
    const ia = initialAppState;
    setAppState(prev_23 => ({
      ...prev_23,
      mainLoopModel: ia.mainLoopModel,
      mainLoopModelForSession: ia.mainLoopModelForSession,
      verbose: ia.verbose,
      thinkingEnabled: ia.thinkingEnabled,
      fastMode: ia.fastMode,
      promptSuggestionEnabled: ia.promptSuggestionEnabled,
      isBriefOnly: ia.isBriefOnly,
      replBridgeEnabled: ia.replBridgeEnabled,
      replBridgeOutboundOnly: ia.replBridgeOutboundOnly,
      settings: ia.settings,
      // Reconcile auto-mode state after useAutoModeDuringPlan revert above —
      // the onChange handler may have activated/deactivated auto mid-plan.
      toolPermissionContext: transitionPlanAutoMode(prev_23.toolPermissionContext)
    }));
    // Bootstrap state: restore userMsgOptIn. Only touched by the defaultView
    // onChange above, so no feature() guard needed here (that path only
    // exists when showDefaultViewPicker is true).
    if (getUserMsgOptIn() !== initialUserMsgOptIn) {
      setUserMsgOptIn(initialUserMsgOptIn);
    }
  }, [themeSetting, setTheme, initialLocalSettings, initialUserSettings, initialAppState, initialUserMsgOptIn, setAppState]);

  // Escape: revert all changes (if any) and close.
  const handleEscape = useCallback(() => {
    if (showSubmenu !== null) {
      return;
    }
    if (isDirty.current) {
      revertChanges();
    }
    onClose('Config dialog dismissed', {
      display: 'system'
    });
  }, [showSubmenu, revertChanges, onClose]);

  // Disable when submenu is open so the submenu's Dialog handles ESC, and in
  // search mode so the onKeyDown handler (which clears-then-exits search)
  // wins — otherwise Escape in search would jump straight to revert+close.
  useKeybinding('confirm:no', handleEscape, {
    context: 'Settings',
    isActive: showSubmenu === null && !isSearchMode && !headerFocused
  });
  // Save-and-close fires on Enter only when not in search mode (Enter there
  // exits search to the list — see the isSearchMode branch in handleKeyDown).
  useKeybinding('settings:close', handleSaveAndClose, {
    context: 'Settings',
    isActive: showSubmenu === null && !isSearchMode && !headerFocused
  });

  // Settings navigation and toggle actions via configurable keybindings.
  // Only active when not in search mode and no submenu is open.
  const toggleSetting = useCallback(() => {
    const setting_0 = filteredSettingsItems[selectedIndex];
    if (!setting_0 || !setting_0.onChange) {
      return;
    }
    if (setting_0.type === 'boolean') {
      isDirty.current = true;
      setting_0.onChange(!setting_0.value);
      if (setting_0.id === 'thinkingEnabled') {
        const newValue = !setting_0.value;
        const backToInitial = newValue === initialThinkingEnabled.current;
        if (backToInitial) {
          setShowThinkingWarning(false);
        } else if (context.messages.some(m_0 => m_0.type === 'assistant')) {
          setShowThinkingWarning(true);
        }
      }
      return;
    }
    const managedSubmenu = MANAGED_SETTING_SUBMENUS[setting_0.id];
    if (managedSubmenu !== undefined) {
      // managedEnum items open a submenu — isDirty is set by the submenu's
      // completion callback, not here (submenu may be cancelled).
      openSubmenu(managedSubmenu);
      return;
    }
    if (setting_0.id === 'autoUpdatesChannel') {
      if (autoUpdaterDisabledReason) {
        // Auto-updates are disabled - show enable dialog instead
        openSubmenu('EnableAutoUpdates');
        return;
      }
      const currentChannel = settingsData?.autoUpdatesChannel ?? 'latest';
      if (currentChannel === 'latest') {
        // Switching to stable - show downgrade dialog
        openSubmenu('ChannelDowngrade');
      } else {
        // Switching to latest - just do it and clear minimumVersion
        isDirty.current = true;
        updateSettingsForSource('userSettings', {
          autoUpdatesChannel: 'latest',
          minimumVersion: undefined
        });
        setSettingsData(prev_24 => ({
          ...prev_24,
          autoUpdatesChannel: 'latest',
          minimumVersion: undefined
        }));
        logEvent('tengu_autoupdate_channel_changed', {
          channel: 'latest' as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
        });
      }
      return;
    }
    if (setting_0.type === 'enum') {
      isDirty.current = true;
      const currentIndex = setting_0.options.indexOf(setting_0.value);
      const nextIndex = (currentIndex + 1) % setting_0.options.length;
      setting_0.onChange(setting_0.options[nextIndex]!);
      return;
    }
  }, [autoUpdaterDisabledReason, filteredSettingsItems, openSubmenu, selectedIndex, settingsData?.autoUpdatesChannel]);
  const moveSelection = (delta: -1 | 1): void => {
    setShowThinkingWarning(false);
    const newIndex_1 = Math.max(0, Math.min(filteredSettingsItems.length - 1, selectedIndex + delta));
    setSelectedIndex(newIndex_1);
    adjustScrollOffset(newIndex_1);
  };
  useKeybindings({
    'select:previous': () => {
      if (selectedIndex === 0) {
        // ↑ at top enters search mode so users can type-to-filter after
        // reaching the list boundary. Wheel-up (scroll:lineUp) clamps
        // instead — overshoot shouldn't move focus away from the list.
        setShowThinkingWarning(false);
        setIsSearchMode(true);
        setScrollOffset(0);
      } else {
        moveSelection(-1);
      }
    },
    'select:next': () => moveSelection(1),
    // Wheel. ScrollKeybindingHandler's scroll:line* returns false (not
    // consumed) when the ScrollBox content fits — which it always does
    // here because the list is paginated (slice). The event falls through
    // to this handler which navigates the list, clamping at boundaries.
    'scroll:lineUp': () => moveSelection(-1),
    'scroll:lineDown': () => moveSelection(1),
    'select:accept': toggleSetting,
    'settings:search': () => {
      setIsSearchMode(true);
      setSearchQuery('');
    }
  }, {
    context: 'Settings',
    isActive: showSubmenu === null && !isSearchMode && !headerFocused
  });

  // Combined key handling across search/list modes. Branch order mirrors
  // the original useInput gate priority: submenu and header short-circuit
  // first (their own handlers own input), then search vs. list.
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (showSubmenu !== null) return;
    if (headerFocused) return;
    // Search mode: Esc clears then exits, Enter/↓ moves to the list.
    if (isSearchMode) {
      if (e.key === 'escape') {
        e.preventDefault();
        if (searchQuery.length > 0) {
          setSearchQuery('');
        } else {
          setIsSearchMode(false);
        }
        return;
      }
      if (e.key === 'return' || e.key === 'down' || e.key === 'wheeldown') {
        e.preventDefault();
        setIsSearchMode(false);
        setSelectedIndex(0);
        setScrollOffset(0);
      }
      return;
    }
    // List mode: left/right/tab cycle the selected option's value. These
    // keys used to switch tabs; now they only do so when the tab row is
    // explicitly focused (see headerFocused in Settings.tsx).
    if (e.key === 'left' || e.key === 'right' || e.key === 'tab') {
      e.preventDefault();
      toggleSetting();
      return;
    }
    // Fallback: printable characters (other than those bound to actions)
    // enter search mode. Carve out j/k// — useKeybindings (still on the
    // useInput path) consumes these via stopImmediatePropagation, but
    // onKeyDown dispatches independently so we must skip them explicitly.
    if (e.ctrl || e.meta) return;
    if (e.key === 'j' || e.key === 'k' || e.key === '/') return;
    if (e.key.length === 1 && e.key !== ' ') {
      e.preventDefault();
      setIsSearchMode(true);
      setSearchQuery(e.key);
    }
  }, [showSubmenu, headerFocused, isSearchMode, searchQuery, setSearchQuery, toggleSetting]);
  return <Box flexDirection="column" width="100%" tabIndex={0} autoFocus onKeyDown={handleKeyDown}>
      {isBasicConfigSubMenu(showSubmenu) ? <>
          {renderBasicConfigSubMenu({
        submenu: showSubmenu,
        mainLoopModel,
        currentOutputStyle,
        currentLanguage,
        showFastModeNotice: isFastModeEnabled() ? isFastMode && isFastModeSupportedByModel(mainLoopModel) && isFastModeAvailable() : false,
        onThemeSelected: setting_1 => {
          isDirty.current = true;
          setTheme(setting_1);
          closeSubmenu();
        },
        onModelSelected: model_0 => {
          isDirty.current = true;
          onChangeMainModelConfig(model_0);
          closeSubmenu();
        },
        onOutputStyleSelected: style => {
          isDirty.current = true;
          setCurrentOutputStyle(style ?? DEFAULT_OUTPUT_STYLE_NAME);

          updateSettingsForSource('localSettings', {
            outputStyle: style
          });
          void logEvent('tengu_output_style_changed', {
            style: (style ?? DEFAULT_OUTPUT_STYLE_NAME) as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
            source: 'config_panel' as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
            settings_source: 'localSettings' as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
          });
          closeSubmenu();
        },
        onLanguageSelected: language => {
          isDirty.current = true;
          setCurrentLanguage(language);

          updateSettingsForSource('userSettings', {
            language
          });
          void logEvent('tengu_language_changed', {
            language: (language ?? 'default') as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
            source: 'config_panel' as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
          });
          closeSubmenu();
        },
        onClose: closeSubmenu
      })}
        </> : isProviderRoutingSubMenu(showSubmenu) ? <>
          {renderProviderRoutingSubMenu({
        submenu: showSubmenu,
        context,
        onClose: closeSubmenu,
        onDirty: () => {
          isDirty.current = true;
        }
      })}
        </> : renderConfigSpecialSubMenu({
      submenu: showSubmenu,
      autoUpdaterDisabledReason,
      closeSubmenu,
      currentVersion: MACRO.VERSION,
      externalIncludes: getExternalMyCodeMdIncludes(memoryFiles),
      teammateDefaultModel: globalConfig.teammateDefaultModel,
      onTeammateModelSelected: model_1 => {
        closeSubmenu();
        // First-open-then-Enter from unset: picker highlights "Default"
        // (initial=null) and confirming would write null, silently
        // switching Opus-fallback -> follow-leader. Treat as no-op.
        if (globalConfig.teammateDefaultModel === undefined && model_1 === null) {
          return;
        }
        isDirty.current = true;
        saveGlobalConfig(current_23 => current_23.teammateDefaultModel === model_1 ? current_23 : {
          ...current_23,
          teammateDefaultModel: model_1
        });
        setGlobalConfig({
          ...getGlobalConfig(),
          teammateDefaultModel: model_1
        });
        setChanges(prev_25 => ({
          ...prev_25,
          teammateDefaultModel: teammateModelDisplayString(model_1)
        }));
        logEvent('tengu_teammate_default_model_changed', {
          model: model_1 as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
        });
      },
      onEnableAutoUpdates: channel => {
        isDirty.current = true;
        closeSubmenu();
        saveGlobalConfig(current_24 => ({
          ...current_24,
          autoUpdates: true
        }));
        setGlobalConfig({
          ...getGlobalConfig(),
          autoUpdates: true
        });
        updateSettingsForSource('userSettings', {
          autoUpdatesChannel: channel,
          minimumVersion: undefined
        });
        setSettingsData(prev_26 => ({
          ...prev_26,
          autoUpdatesChannel: channel,
          minimumVersion: undefined
        }));
        logEvent('tengu_autoupdate_enabled', {
          channel: channel as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
        });
      },
      onChannelDowngradeChoice: choice => {
        closeSubmenu();
        if (choice === 'cancel') {
          return;
        }
        isDirty.current = true;
        const newSettings: {
          autoUpdatesChannel: 'stable';
          minimumVersion?: string;
        } = {
          autoUpdatesChannel: 'stable'
        };
        if (choice === 'stay') {
          newSettings.minimumVersion = MACRO.VERSION;
        }
        updateSettingsForSource('userSettings', newSettings);
        setSettingsData(prev_27 => ({
          ...prev_27,
          ...newSettings
        }));
        logEvent('tengu_autoupdate_channel_changed', {
          channel: 'stable' as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
          minimum_version_set: choice === 'stay'
        });
      }
    }) ?? <ConfigListView autoUpdaterDisabledReasonText={autoUpdaterDisabledReason ? formatAutoUpdaterDisabledReason(autoUpdaterDisabledReason) : undefined} filteredSettingsItems={filteredSettingsItems} headerFocused={headerFocused} insideModal={!!insideModal} isSearchMode={isSearchMode} isTerminalFocused={isTerminalFocused} maxVisible={maxVisible} scrollOffset={scrollOffset} searchCursorOffset={searchCursorOffset} searchQuery={searchQuery} selectedIndex={selectedIndex} showThinkingWarning={showThinkingWarning} />}
    </Box>;
}
function teammateModelDisplayString(value: string | null | undefined): string {
  if (value === undefined) {
    return modelDisplayString(getHardcodedTeammateModelFallback());
  }
  if (value === null) return "Default (leader's model)";
  return modelDisplayString(value);
}
