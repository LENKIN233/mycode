// biome-ignore-all assist/source/organizeImports: ANT-ONLY import markers must not be reordered
import { Box, useTheme, useThemeSetting, useTerminalFocus } from '../../ink.js';
import * as React from 'react';
import { useState, useCallback } from 'react';
import { useKeybinding } from '../../keybindings/useKeybinding.js';
import { type GlobalConfig, saveGlobalConfig, type OutputStyle } from '../../utils/config.js';
import { getGlobalConfig, getAutoUpdaterDisabledReason, formatAutoUpdaterDisabledReason, getRemoteControlAtStartup } from '../../utils/config.js';
import { logEvent, type AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from 'src/services/analytics/index.js';
import { isBridgeEnabled } from '../../bridge/bridgeEnabled.js';
import { useAppState, useSetAppState, useAppStateStore } from '../../state/AppState.js';
import { getExternalMyCodeMdIncludes, getMemoryFiles, hasExternalMyCodeMdIncludes } from 'src/utils/mycodeMd.js';
import type { ChannelDowngradeChoice } from '../ChannelDowngradeDialog.js';
import { useTabHeaderFocus } from '../design-system/Tabs.js';
import { useIsInsideModal } from '../../context/modalContext.js';
import { isSupportedTerminal, hasAccessToIDEExtensionDiffFeature } from '../../utils/ide.js';
import { getInitialSettings, getSettingsForSource, updateSettingsForSource } from '../../utils/settings/settings.js';
import { DEFAULT_OUTPUT_STYLE_NAME } from 'src/constants/outputStyles.js';
import { isEnvTruthy } from 'src/utils/envUtils.js';
import type { LocalJSXCommandContext, CommandResultDisplay } from '../../commands.js';
import { getFeatureValue_CACHED_MAY_BE_STALE } from '../../services/analytics/growthbook.js';
import { useSearchInput } from '../../hooks/useSearchInput.js';
import { useTerminalSize } from '../../hooks/useTerminalSize.js';
import { isFastModeAvailable, isFastModeEnabled, isFastModeSupportedByModel } from '../../utils/fastMode.js';
import { isFullscreenEnvEnabled } from '../../utils/fullscreen.js';
import { getDisplaySettingsItems } from './displaySettings.js';
import { getProviderRoutingSettingsItems } from './providerRoutingSettings.js';
import { getConfigCoreSettings } from './configCoreSettings.js';
import { getConfigIntegrationSettings } from './configIntegrationSettings.js';
import { getConfigApiKeySetting } from './configApiKeySetting.js';
import { applyMainModelConfigChange, applyVerboseConfigChange } from './configChangeHandlers.js';
import { teammateModelDisplayString } from './configLabels.js';
import { getConfigToggleAction } from './configToggleAction.js';
import { buildConfigChangeSummary } from './configChangeSummary.js';
import { revertConfigChanges } from './configRevert.js';
import { renderConfigSubmenuContent } from './configSubmenuContent.js';
import { useConfigNavigation } from './useConfigNavigation.js';
import { useConfigSelectionWindow } from './useConfigSelectionWindow.js';
import type { AutoUpdateChannel, ConfigSubMenu, Setting } from './types.js';
type Props = {
  onClose: (result?: string, options?: {
    display?: CommandResultDisplay;
  }) => void;
  context: LocalJSXCommandContext;
  setTabsHidden: (hidden: boolean) => void;
  onIsSearchModeChange?: (inSearchMode: boolean) => void;
  contentHeight?: number;
};
const MANAGED_SETTING_SUBMENUS: Record<string, ConfigSubMenu> = {
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
  // Set on first user-visible change; gates revertChanges() on Escape so
  // opening-then-closing doesn't trigger redundant disk writes.
  const isDirty = React.useRef(false);
  const [showThinkingWarning, setShowThinkingWarning] = useState(false);
  const [showSubmenu, setShowSubmenu] = useState<ConfigSubMenu | null>(null);
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
  const openSubmenu = useCallback((submenu: ConfigSubMenu) => {
    setShowSubmenu(submenu);
    setTabsHidden(true);
  }, [setTabsHidden]);
  function onChangeMainModelConfig(value: string | null): void {
    applyMainModelConfigChange({
      mainLoopModel,
      setAppState,
      setChanges,
      value,
    });
  }
  function onChangeVerbose(value_0: boolean): void {
    applyVerboseConfigChange({
      setAppState,
      setChanges,
      setGlobalConfig,
      value: value_0,
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
  const settingsItems: Setting[] = [
  ...coreSettingsItems, ...providerRoutingItems, ...displaySettingsItems, ...integrationSettingsItems, ...apiKeySettingsItems];

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

  const adjustScrollOffset = useConfigSelectionWindow({
    filteredSettingsLength: filteredSettingsItems.length,
    maxVisible,
    selectedIndex,
    setScrollOffset,
    setSelectedIndex,
  });

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
    revertConfigChanges({
      initialAppState,
      initialConfig: initialConfig.current,
      initialLocalSettings,
      initialThemeSetting: initialThemeSetting.current,
      initialUserSettings,
      setAppState,
      setTheme,
      themeSetting,
    });
  }, [themeSetting, setTheme, initialLocalSettings, initialUserSettings, initialAppState, setAppState]);

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
    const managedSubmenu = setting_0 ? MANAGED_SETTING_SUBMENUS[setting_0.id] : undefined;
    const toggleAction = getConfigToggleAction({
      autoUpdaterDisabledReason,
      currentAutoUpdateChannel: settingsData?.autoUpdatesChannel ?? 'latest',
      managedSubmenu,
      setting: setting_0,
    });

    if (!setting_0 || !setting_0.onChange || toggleAction.kind === 'none') {
      return;
    }

    if (toggleAction.kind === 'toggleBoolean') {
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

    if (toggleAction.kind === 'openSubmenu') {
      openSubmenu(toggleAction.submenu);
      return;
    }

    if (toggleAction.kind === 'setLatestAutoUpdates') {
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
      return;
    }

    if (toggleAction.kind === 'cycleEnum') {
      isDirty.current = true;
      setting_0.onChange(toggleAction.nextValue);
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
  const handleEnableAutoUpdates = useCallback((channel: AutoUpdateChannel) => {
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
  const handleChannelDowngradeChoice = useCallback((choice: ChannelDowngradeChoice) => {
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
  const handleKeyDown = useConfigNavigation({
    adjustScrollOffset,
    filteredSettingsLength: filteredSettingsItems.length,
    headerFocused,
    isSearchMode,
    maxVisible,
    searchQuery,
    selectedIndex,
    setIsSearchMode,
    setScrollOffset,
    setSearchQuery,
    setSelectedIndex,
    setShowThinkingWarning,
    showSubmenu,
    toggleSetting,
  });
  return <Box flexDirection="column" width="100%" tabIndex={0} autoFocus onKeyDown={handleKeyDown}>
      {renderConfigSubmenuContent({
        autoUpdaterDisabledReason,
        closeSubmenu,
        context,
        currentLanguage,
        currentOutputStyle,
        currentVersion: MACRO.VERSION,
        externalIncludes: getExternalMyCodeMdIncludes(memoryFiles),
        filteredSettingsItems,
        headerFocused,
        insideModal: !!insideModal,
        isSearchMode,
        isTerminalFocused,
        maxVisible,
        mainLoopModel,
        onChannelDowngradeChoice: handleChannelDowngradeChoice,
        onEnableAutoUpdates: handleEnableAutoUpdates,
        onLanguageSelected: handleLanguageSelected,
        onModelSelected: handleModelSelected,
        onOutputStyleSelected: handleOutputStyleSelected,
        onProviderRoutingDirty: handleProviderRoutingDirty,
        onTeammateModelSelected: handleTeammateModelSelected,
        onThemeSelected: handleThemeSelected,
        scrollOffset,
        searchCursorOffset,
        searchQuery,
        selectedIndex,
        showFastModeNotice,
        showSubmenu,
        showThinkingWarning,
        teammateDefaultModel: globalConfig.teammateDefaultModel
      })}
    </Box>;
}
