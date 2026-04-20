// biome-ignore-all assist/source/organizeImports: ANT-ONLY import markers must not be reordered
import { Box, useTheme, useThemeSetting, useTerminalFocus } from '../../ink.js';
import type { KeyboardEvent } from '../../ink/events/keyboard-event.js';
import * as React from 'react';
import { useState, useCallback } from 'react';
import { useKeybinding, useKeybindings } from '../../keybindings/useKeybinding.js';
import { type GlobalConfig, saveGlobalConfig, type OutputStyle } from '../../utils/config.js';
import { getGlobalConfig, getAutoUpdaterDisabledReason, formatAutoUpdaterDisabledReason, getRemoteControlAtStartup } from '../../utils/config.js';
import { transitionPlanAutoMode } from '../../utils/permissions/permissionSetup.js';
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
import { isEnvTruthy } from 'src/utils/envUtils.js';
import type { LocalJSXCommandContext, CommandResultDisplay } from '../../commands.js';
import { getFeatureValue_CACHED_MAY_BE_STALE } from '../../services/analytics/growthbook.js';
import { useSearchInput } from '../../hooks/useSearchInput.js';
import { useTerminalSize } from '../../hooks/useTerminalSize.js';
import { isFastModeAvailable, isFastModeEnabled, isFastModeSupportedByModel } from '../../utils/fastMode.js';
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
import { getConfigCoreSettings } from './configCoreSettings.js';
import { getConfigIntegrationSettings } from './configIntegrationSettings.js';
import { getConfigApiKeySetting } from './configApiKeySetting.js';
import { getConfigViewSettings } from './configViewSettings.js';
import { teammateModelDisplayString } from './configLabels.js';
import { ConfigListView } from './configListView.js';
import { buildConfigChangeSummary } from './configChangeSummary.js';
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
  const dismissConfig = useCallback(() => {
    onClose('Config dialog dismissed', {
      display: 'system'
    });
  }, [onClose]);
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
  const coreSettingsItems = getConfigCoreSettings({
    autoUpdaterDisabledReason,
    globalConfig,
    isFastMode,
    isFileCheckpointingAvailable,
    promptSuggestionEnabled,
    setAppState,
    setChanges,
    setGlobalConfig,
    setSettingsData,
    settingsData,
    showAutoInDefaultModePicker,
    showPromptSuggestionSetting: getFeatureValue_CACHED_MAY_BE_STALE('tengu_chomp_inflection', false),
    thinkingEnabled,
  });
  const integrationSettingsItems = getConfigIntegrationSettings({
    globalConfig,
    isConnectedToIde,
    isSupportedTerminal: isSupportedTerminal(),
    mainLoopModel,
    onChangeMainModelConfig,
    setGlobalConfig,
    shouldShowExternalIncludesToggle,
    teammateModelDisplayString,
  });
  const apiKeySettingsItems = getConfigApiKeySetting({
    globalConfig,
    setGlobalConfig,
  });
  const viewSettingsItems = getConfigViewSettings({
    setAppState,
    setChanges,
    setSettingsData,
    settingsData,
    showDefaultViewPicker,
  });
  const settingsItems: Setting[] = [
  ...coreSettingsItems, ...providerRoutingItems, ...displaySettingsItems, ...viewSettingsItems, ...integrationSettingsItems, ...apiKeySettingsItems];

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
    const formattedChanges = buildConfigChangeSummary({
      changes,
      currentLanguage,
      currentOutputStyle,
      globalConfig,
      initialConfig: initialConfig.current,
      initialLanguage: initialLanguage.current,
      initialOutputStyle: initialOutputStyle.current,
      initialSettingsData: initialSettingsData.current,
      settingsData,
    });
    if (formattedChanges.length > 0) {
      onClose(formattedChanges.join('\n'));
    } else {
      dismissConfig();
    }
  }, [showSubmenu, changes, globalConfig, currentOutputStyle, currentLanguage, settingsData, onClose, dismissConfig]);

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
    dismissConfig();
  }, [showSubmenu, revertChanges, dismissConfig]);

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
  const showFastModeNotice = isFastModeEnabled() ? isFastMode && isFastModeSupportedByModel(mainLoopModel) && isFastModeAvailable() : false;
  const handleThemeSelected = useCallback((setting: string) => {
    isDirty.current = true;
    setTheme(setting);
    closeSubmenu();
  }, [setTheme, closeSubmenu]);
  const handleModelSelected = useCallback((model: string | null) => {
    isDirty.current = true;
    onChangeMainModelConfig(model);
    closeSubmenu();
  }, [onChangeMainModelConfig, closeSubmenu]);
  const handleOutputStyleSelected = useCallback((style: OutputStyle | undefined) => {
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
  }, [closeSubmenu]);
  const handleLanguageSelected = useCallback((language: string | undefined) => {
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
  }, [closeSubmenu]);
  const handleProviderRoutingDirty = useCallback(() => {
    isDirty.current = true;
  }, []);
  const handleTeammateModelSelected = useCallback((model: string | null) => {
    closeSubmenu();
    if (globalConfig.teammateDefaultModel === undefined && model === null) {
      return;
    }
    isDirty.current = true;
    saveGlobalConfig(current_23 => current_23.teammateDefaultModel === model ? current_23 : {
      ...current_23,
      teammateDefaultModel: model
    });
    setGlobalConfig({
      ...getGlobalConfig(),
      teammateDefaultModel: model
    });
    setChanges(prev_25 => ({
      ...prev_25,
      teammateDefaultModel: teammateModelDisplayString(model)
    }));
    logEvent('tengu_teammate_default_model_changed', {
      model: model as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
    });
  }, [closeSubmenu, globalConfig.teammateDefaultModel, setGlobalConfig]);
  const handleEnableAutoUpdates = useCallback((channel: 'stable' | 'latest') => {
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
  }, [closeSubmenu, setGlobalConfig, setSettingsData]);
  const handleChannelDowngradeChoice = useCallback((choice: 'cancel' | 'downgrade' | 'stay') => {
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
  }, [closeSubmenu, setSettingsData]);
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
        showFastModeNotice,
        onThemeSelected: handleThemeSelected,
        onModelSelected: handleModelSelected,
        onOutputStyleSelected: handleOutputStyleSelected,
        onLanguageSelected: handleLanguageSelected,
        onClose: closeSubmenu
      })}
        </> : isProviderRoutingSubMenu(showSubmenu) ? <>
          {renderProviderRoutingSubMenu({
        submenu: showSubmenu,
        context,
        onClose: closeSubmenu,
        onDirty: handleProviderRoutingDirty
      })}
        </> : renderConfigSpecialSubMenu({
      submenu: showSubmenu,
      autoUpdaterDisabledReason,
      closeSubmenu,
      currentVersion: MACRO.VERSION,
      externalIncludes: getExternalMyCodeMdIncludes(memoryFiles),
      teammateDefaultModel: globalConfig.teammateDefaultModel,
      onTeammateModelSelected: handleTeammateModelSelected,
      onEnableAutoUpdates: handleEnableAutoUpdates,
      onChannelDowngradeChoice: handleChannelDowngradeChoice
    }) ?? <ConfigListView autoUpdaterDisabledReasonText={autoUpdaterDisabledReason ? formatAutoUpdaterDisabledReason(autoUpdaterDisabledReason) : undefined} filteredSettingsItems={filteredSettingsItems} headerFocused={headerFocused} insideModal={!!insideModal} isSearchMode={isSearchMode} isTerminalFocused={isTerminalFocused} maxVisible={maxVisible} scrollOffset={scrollOffset} searchCursorOffset={searchCursorOffset} searchQuery={searchQuery} selectedIndex={selectedIndex} showThinkingWarning={showThinkingWarning} />}
    </Box>;
}
