import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Server, Globe, Shield, AlertCircle, CheckCircle, Code, Plus, Trash2, Star, Download, X, Settings as SettingsIcon } from 'lucide-react';
import { settingsAPI, agentVersionAPI, versionAPI } from '../utils/api';

const Settings = () => {
  const [formData, setFormData] = useState({
    serverProtocol: 'http',
    serverHost: 'localhost',
    serverPort: 3001,
    frontendUrl: 'http://localhost:3000',
    updateInterval: 60,
    autoUpdate: false,
    githubRepoUrl: 'git@github.com:9technologygroup/patchmon.net.git',
    sshKeyPath: '',
    useCustomSshKey: false
  });
  const [errors, setErrors] = useState({});
  const [isDirty, setIsDirty] = useState(false);
  
  // Tab management
  const [activeTab, setActiveTab] = useState('server');
  
  // Tab configuration
  const tabs = [
    { id: 'server', name: 'Server Configuration', icon: Server },
    { id: 'frontend', name: 'Frontend Configuration', icon: Globe },
    { id: 'agent', name: 'Agent Management', icon: SettingsIcon },
    { id: 'version', name: 'Server Version', icon: Code }
  ];
  
  // Agent version management state
  const [showAgentVersionModal, setShowAgentVersionModal] = useState(false);
  const [editingAgentVersion, setEditingAgentVersion] = useState(null);
  const [agentVersionForm, setAgentVersionForm] = useState({
    version: '',
    releaseNotes: '',
    scriptContent: '',
    isDefault: false
  });

  // Version checking state
  const [versionInfo, setVersionInfo] = useState({
    currentVersion: '1.2.3',
    latestVersion: null,
    isUpdateAvailable: false,
    checking: false,
    error: null
  });
  
  const [sshTestResult, setSshTestResult] = useState({
    testing: false,
    success: null,
    message: null,
    error: null
  });

  const queryClient = useQueryClient();

  // Fetch current settings
  const { data: settings, isLoading, error } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsAPI.get().then(res => res.data)
  });

  // Update form data when settings are loaded
  useEffect(() => {
    if (settings) {
      console.log('Settings loaded:', settings);
      console.log('updateInterval from settings:', settings.updateInterval);
      const newFormData = {
        serverProtocol: settings.serverProtocol || 'http',
        serverHost: settings.serverHost || 'localhost',
        serverPort: settings.serverPort || 3001,
        frontendUrl: settings.frontendUrl || 'http://localhost:3000',
        updateInterval: settings.updateInterval || 60,
        autoUpdate: settings.autoUpdate || false,
        githubRepoUrl: settings.githubRepoUrl || 'git@github.com:9technologygroup/patchmon.net.git',
        sshKeyPath: settings.sshKeyPath || '',
        useCustomSshKey: !!settings.sshKeyPath
      };
      console.log('Setting form data to:', newFormData);
      setFormData(newFormData);
      setIsDirty(false);
    }
  }, [settings]);

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: (data) => {
      console.log('Mutation called with data:', data);
      return settingsAPI.update(data).then(res => {
        console.log('API response:', res);
        return res.data;
      });
    },
    onSuccess: (data) => {
      console.log('Mutation success:', data);
      console.log('Invalidating queries and updating form data');
      queryClient.invalidateQueries(['settings']);
      // Update form data with the returned data
      setFormData({
        serverProtocol: data.settings?.serverProtocol || data.serverProtocol || 'http',
        serverHost: data.settings?.serverHost || data.serverHost || 'localhost',
        serverPort: data.settings?.serverPort || data.serverPort || 3001,
        frontendUrl: data.settings?.frontendUrl || data.frontendUrl || 'http://localhost:3000',
        updateInterval: data.settings?.updateInterval || data.updateInterval || 60,
        autoUpdate: data.settings?.autoUpdate || data.autoUpdate || false,
        githubRepoUrl: data.settings?.githubRepoUrl || data.githubRepoUrl || 'git@github.com:9technologygroup/patchmon.net.git',
        sshKeyPath: data.settings?.sshKeyPath || data.sshKeyPath || '',
        useCustomSshKey: !!(data.settings?.sshKeyPath || data.sshKeyPath)
      });
      setIsDirty(false);
      setErrors({});
    },
    onError: (error) => {
      console.log('Mutation error:', error);
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors.reduce((acc, err) => {
          acc[err.path] = err.msg;
          return acc;
        }, {}));
      } else {
        setErrors({ general: error.response?.data?.error || 'Failed to update settings' });
      }
    }
  });

  // Agent version queries and mutations
  const { data: agentVersions, isLoading: agentVersionsLoading, error: agentVersionsError } = useQuery({
    queryKey: ['agentVersions'],
    queryFn: () => {
      console.log('Fetching agent versions...');
      return agentVersionAPI.list().then(res => {
        console.log('Agent versions API response:', res);
        return res.data;
      });
    }
  });

  // Debug agent versions
  useEffect(() => {
    console.log('Agent versions data:', agentVersions);
    console.log('Agent versions loading:', agentVersionsLoading);
    console.log('Agent versions error:', agentVersionsError);
  }, [agentVersions, agentVersionsLoading, agentVersionsError]);

  const createAgentVersionMutation = useMutation({
    mutationFn: (data) => agentVersionAPI.create(data).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries(['agentVersions']);
      setShowAgentVersionModal(false);
      setAgentVersionForm({ version: '', releaseNotes: '', scriptContent: '', isDefault: false });
    }
  });

  const setCurrentAgentVersionMutation = useMutation({
    mutationFn: (id) => agentVersionAPI.setCurrent(id).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries(['agentVersions']);
    }
  });

  const setDefaultAgentVersionMutation = useMutation({
    mutationFn: (id) => agentVersionAPI.setDefault(id).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries(['agentVersions']);
    }
  });

  const deleteAgentVersionMutation = useMutation({
    mutationFn: (id) => agentVersionAPI.delete(id).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries(['agentVersions']);
    }
  });

  // Version checking functions
  const checkForUpdates = async () => {
    setVersionInfo(prev => ({ ...prev, checking: true, error: null }));
    
    try {
      const response = await versionAPI.checkUpdates();
      const data = response.data;
      
      setVersionInfo({
        currentVersion: data.currentVersion,
        latestVersion: data.latestVersion,
        isUpdateAvailable: data.isUpdateAvailable,
        checking: false,
        error: null
      });
    } catch (error) {
      console.error('Version check error:', error);
      setVersionInfo(prev => ({
        ...prev,
        checking: false,
        error: error.response?.data?.error || 'Failed to check for updates'
      }));
    }
  };

  const testSshKey = async () => {
    if (!formData.sshKeyPath || !formData.githubRepoUrl) {
      setSshTestResult({
        testing: false,
        success: false,
        message: null,
        error: 'Please enter both SSH key path and GitHub repository URL'
      });
      return;
    }

    setSshTestResult({ testing: true, success: null, message: null, error: null });
    
    try {
      const response = await versionAPI.testSshKey({
        sshKeyPath: formData.sshKeyPath,
        githubRepoUrl: formData.githubRepoUrl
      });
      
      setSshTestResult({
        testing: false,
        success: true,
        message: response.data.message,
        error: null
      });
    } catch (error) {
      console.error('SSH key test error:', error);
      setSshTestResult({
        testing: false,
        success: false,
        message: null,
        error: error.response?.data?.error || 'Failed to test SSH key'
      });
    }
  };

  const handleInputChange = (field, value) => {
    console.log(`handleInputChange: ${field} = ${value}`);
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      console.log('New form data:', newData);
      return newData;
    });
    setIsDirty(true);
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Only include sshKeyPath if the toggle is enabled
    const dataToSubmit = { ...formData };
    if (!dataToSubmit.useCustomSshKey) {
      dataToSubmit.sshKeyPath = '';
    }
    // Remove the frontend-only field
    delete dataToSubmit.useCustomSshKey;
    
    updateSettingsMutation.mutate(dataToSubmit);
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.serverHost.trim()) {
      newErrors.serverHost = 'Server host is required';
    }
    
    if (!formData.serverPort || formData.serverPort < 1 || formData.serverPort > 65535) {
      newErrors.serverPort = 'Port must be between 1 and 65535';
    }
    
    try {
      new URL(formData.frontendUrl);
    } catch {
      newErrors.frontendUrl = 'Frontend URL must be a valid URL';
    }
    
    if (!formData.updateInterval || formData.updateInterval < 5 || formData.updateInterval > 1440) {
      newErrors.updateInterval = 'Update interval must be between 5 and 1440 minutes';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    console.log('Saving settings:', formData);
    if (validateForm()) {
      console.log('Validation passed, calling mutation');
      
      // Prepare data for submission
      const dataToSubmit = { ...formData };
      if (!dataToSubmit.useCustomSshKey) {
        dataToSubmit.sshKeyPath = '';
      }
      // Remove the frontend-only field
      delete dataToSubmit.useCustomSshKey;
      
      updateSettingsMutation.mutate(dataToSubmit);
    } else {
      console.log('Validation failed:', errors);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-md p-4">
        <div className="flex">
          <AlertCircle className="h-5 w-5 text-red-400 dark:text-red-300" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error loading settings</h3>
            <p className="mt-1 text-sm text-red-700 dark:text-red-300">
              {error.response?.data?.error || 'Failed to load settings'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <p className="text-secondary-600 dark:text-secondary-300">
          Configure your PatchMon server settings. These settings will be used in installation scripts and agent communications.
        </p>
      </div>

      {errors.general && (
        <div className="mb-6 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400 dark:text-red-300" />
            <div className="ml-3">
              <p className="text-sm text-red-700 dark:text-red-300">{errors.general}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-secondary-800 shadow rounded-lg">
        <div className="border-b border-secondary-200 dark:border-secondary-600">
          <nav className="-mb-px flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                      : 'border-transparent text-secondary-500 dark:text-secondary-400 hover:text-secondary-700 dark:hover:text-secondary-300 hover:border-secondary-300 dark:hover:border-secondary-500'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Server Configuration Tab */}
          {activeTab === 'server' && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex items-center mb-6">
                <Server className="h-6 w-6 text-primary-600 mr-3" />
                <h2 className="text-xl font-semibold text-secondary-900 dark:text-white">Server Configuration</h2>
              </div>
          
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-200 mb-2">
                Protocol
              </label>
              <select
                value={formData.serverProtocol}
                onChange={(e) => handleInputChange('serverProtocol', e.target.value)}
                className="w-full border-secondary-300 dark:border-secondary-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white"
              >
                <option value="http">HTTP</option>
                <option value="https">HTTPS</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-200 mb-2">
                Host *
              </label>
              <input
                type="text"
                value={formData.serverHost}
                onChange={(e) => handleInputChange('serverHost', e.target.value)}
                className={`w-full border rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white ${
                  errors.serverHost ? 'border-red-300 dark:border-red-500' : 'border-secondary-300 dark:border-secondary-600'
                }`}
                placeholder="example.com"
              />
              {errors.serverHost && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.serverHost}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-200 mb-2">
                Port *
              </label>
              <input
                type="number"
                value={formData.serverPort}
                onChange={(e) => handleInputChange('serverPort', parseInt(e.target.value))}
                className={`w-full border rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white ${
                  errors.serverPort ? 'border-red-300 dark:border-red-500' : 'border-secondary-300 dark:border-secondary-600'
                }`}
                min="1"
                max="65535"
              />
              {errors.serverPort && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.serverPort}</p>
              )}
            </div>
          </div>

          <div className="mt-4 p-4 bg-secondary-50 dark:bg-secondary-700 rounded-md">
            <h4 className="text-sm font-medium text-secondary-900 dark:text-white mb-2">Server URL</h4>
            <p className="text-sm text-secondary-600 dark:text-secondary-300 font-mono">
              {formData.serverProtocol}://{formData.serverHost}:{formData.serverPort}
            </p>
            <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-1">
              This URL will be used in installation scripts and agent communications.
            </p>
              </div>

              {/* Update Interval */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-200 mb-2">
                  Agent Update Interval (minutes)
                </label>
                <input
                  type="number"
                  min="5"
                  max="1440"
                  value={formData.updateInterval}
                  onChange={(e) => {
                    console.log('Update interval input changed:', e.target.value);
                    handleInputChange('updateInterval', parseInt(e.target.value) || 60);
                  }}
                  className={`w-full border rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white ${
                    errors.updateInterval ? 'border-red-300 dark:border-red-500' : 'border-secondary-300 dark:border-secondary-600'
                  }`}
                  placeholder="60"
                />
                {errors.updateInterval && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.updateInterval}</p>
                )}
                <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
                  How often agents should check for updates (5-1440 minutes). This affects new installations.
                </p>
              </div>

              {/* Auto-Update Setting */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-200 mb-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.autoUpdate}
                      onChange={(e) => handleInputChange('autoUpdate', e.target.checked)}
                      className="rounded border-secondary-300 text-primary-600 shadow-sm focus:border-primary-300 focus:ring focus:ring-primary-200 focus:ring-opacity-50"
                    />
                    Enable Automatic Agent Updates
                  </div>
                </label>
                <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
                  When enabled, agents will automatically update themselves when a newer version is available during their regular update cycle.
                </p>
              </div>

              {/* Security Notice */}
              <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-md p-4">
                <div className="flex">
                  <Shield className="h-5 w-5 text-blue-400 dark:text-blue-300" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">Security Notice</h3>
                    <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
                      Changing these settings will affect all installation scripts and agent communications. 
                      Make sure the server URL is accessible from your client networks.
                    </p>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!isDirty || updateSettingsMutation.isPending}
                  className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
                    !isDirty || updateSettingsMutation.isPending
                      ? 'bg-secondary-400 cursor-not-allowed'
                      : 'bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500'
                  }`}
                >
                  {updateSettingsMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Settings
                    </>
                  )}
                </button>
              </div>

              {updateSettingsMutation.isSuccess && (
                <div className="bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-md p-4">
                  <div className="flex">
                    <CheckCircle className="h-5 w-5 text-green-400 dark:text-green-300" />
                    <div className="ml-3">
                      <p className="text-sm text-green-700 dark:text-green-300">Settings saved successfully!</p>
                    </div>
                  </div>
                </div>
              )}
            </form>
          )}

          {/* Frontend Configuration Tab */}
          {activeTab === 'frontend' && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex items-center mb-6">
                <Globe className="h-6 w-6 text-primary-600 mr-3" />
                <h2 className="text-xl font-semibold text-secondary-900 dark:text-white">Frontend Configuration</h2>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-200 mb-2">
                  Frontend URL *
                </label>
                <input
                  type="url"
                  value={formData.frontendUrl}
                  onChange={(e) => handleInputChange('frontendUrl', e.target.value)}
                  className={`w-full border rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white ${
                    errors.frontendUrl ? 'border-red-300 dark:border-red-500' : 'border-secondary-300 dark:border-secondary-600'
                  }`}
                  placeholder="https://patchmon.example.com"
                />
                {errors.frontendUrl && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.frontendUrl}</p>
                )}
                <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
                  The URL where users will access the PatchMon web interface.
                </p>
              </div>

              {/* Save Button */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!isDirty || updateSettingsMutation.isPending}
                  className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
                    !isDirty || updateSettingsMutation.isPending
                      ? 'bg-secondary-400 cursor-not-allowed'
                      : 'bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500'
                  }`}
                >
                  {updateSettingsMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Settings
                    </>
                  )}
                </button>
              </div>

              {updateSettingsMutation.isSuccess && (
                <div className="bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-md p-4">
                  <div className="flex">
                    <CheckCircle className="h-5 w-5 text-green-400 dark:text-green-300" />
                    <div className="ml-3">
                      <p className="text-sm text-green-700 dark:text-green-300">Settings saved successfully!</p>
                    </div>
                  </div>
                </div>
              )}
            </form>
          )}

          {/* Agent Management Tab */}
          {activeTab === 'agent' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="flex items-center mb-2">
                    <SettingsIcon className="h-6 w-6 text-primary-600 mr-3" />
                    <h2 className="text-xl font-semibold text-secondary-900 dark:text-white">Agent Version Management</h2>
                  </div>
                  <p className="text-sm text-secondary-500 dark:text-secondary-300">
                    Manage different versions of the PatchMon agent script
                  </p>
                </div>
                <button
                  onClick={() => setShowAgentVersionModal(true)}
                  className="btn-primary flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Version
                </button>
              </div>

              {/* Version Summary */}
              {agentVersions && agentVersions.length > 0 && (
                <div className="bg-secondary-50 dark:bg-secondary-700 rounded-lg p-4 mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                      <span className="text-sm font-medium text-secondary-700 dark:text-secondary-300">Current Version:</span>
                      <span className="text-sm text-secondary-900 dark:text-white font-mono">
                        {agentVersions.find(v => v.isCurrent)?.version || 'None'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                      <span className="text-sm font-medium text-secondary-700 dark:text-secondary-300">Default Version:</span>
                      <span className="text-sm text-secondary-900 dark:text-white font-mono">
                        {agentVersions.find(v => v.isDefault)?.version || 'None'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

        {agentVersionsLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : agentVersionsError ? (
          <div className="text-center py-8">
            <p className="text-red-600 dark:text-red-400">Error loading agent versions: {agentVersionsError.message}</p>
          </div>
        ) : !agentVersions || agentVersions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-secondary-500 dark:text-secondary-400">No agent versions found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {agentVersions.map((version) => (
              <div key={version.id} className="border border-secondary-200 dark:border-secondary-600 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Code className="h-5 w-5 text-secondary-400 dark:text-secondary-500" />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-medium text-secondary-900 dark:text-white">
                          Version {version.version}
                        </h3>
                        {version.isDefault && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200">
                            <Star className="h-3 w-3 mr-1" />
                            Default
                          </span>
                        )}
                        {version.isCurrent && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            Current
                          </span>
                        )}
                      </div>
                      {version.releaseNotes && (
                        <div className="text-sm text-secondary-500 dark:text-secondary-300 mt-1">
                          <p className="line-clamp-3 whitespace-pre-line">
                            {version.releaseNotes}
                          </p>
                        </div>
                      )}
                      <p className="text-xs text-secondary-400 dark:text-secondary-400 mt-1">
                        Created: {new Date(version.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const downloadUrl = `/api/v1/hosts/agent/download?version=${version.version}`;
                        window.open(downloadUrl, '_blank');
                      }}
                      className="btn-outline text-xs flex items-center gap-1"
                    >
                      <Download className="h-3 w-3" />
                      Download
                    </button>
                    <button
                      onClick={() => setCurrentAgentVersionMutation.mutate(version.id)}
                      disabled={version.isCurrent || setCurrentAgentVersionMutation.isPending}
                      className="btn-outline text-xs flex items-center gap-1"
                    >
                      <CheckCircle className="h-3 w-3" />
                      Set Current
                    </button>
                    <button
                      onClick={() => setDefaultAgentVersionMutation.mutate(version.id)}
                      disabled={version.isDefault || setDefaultAgentVersionMutation.isPending}
                      className="btn-outline text-xs flex items-center gap-1"
                    >
                      <Star className="h-3 w-3" />
                      Set Default
                    </button>
                    <button
                      onClick={() => deleteAgentVersionMutation.mutate(version.id)}
                      disabled={version.isDefault || version.isCurrent || deleteAgentVersionMutation.isPending}
                      className="btn-danger text-xs flex items-center gap-1"
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
            
            {agentVersions?.length === 0 && (
              <div className="text-center py-8">
                <Code className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
                <p className="text-secondary-500 dark:text-secondary-300">No agent versions found</p>
                <p className="text-sm text-secondary-400 dark:text-secondary-400 mt-2">
                  Add your first agent version to get started
                </p>
              </div>
            )}
              </div>
            )}
            </div>
          )}

          {/* Server Version Tab */}
          {activeTab === 'version' && (
            <div className="space-y-6">
              <div className="flex items-center mb-6">
                <Code className="h-6 w-6 text-primary-600 mr-3" />
                <h2 className="text-xl font-semibold text-secondary-900 dark:text-white">Server Version Management</h2>
              </div>
              
              <div className="bg-secondary-50 dark:bg-secondary-700 rounded-lg p-6">
                <h3 className="text-lg font-medium text-secondary-900 dark:text-white mb-4">Version Check Configuration</h3>
                <p className="text-sm text-secondary-600 dark:text-secondary-300 mb-6">
                  Configure automatic version checking against your GitHub repository to notify users of available updates.
                </p>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-200 mb-2">
                      GitHub Repository URL
                    </label>
                    <input
                      type="text"
                      value={formData.githubRepoUrl || 'git@github.com:9technologygroup/patchmon.net.git'}
                      onChange={(e) => handleInputChange('githubRepoUrl', e.target.value)}
                      className="w-full border border-secondary-300 dark:border-secondary-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white font-mono text-sm"
                      placeholder="git@github.com:username/repository.git"
                    />
                    <p className="mt-1 text-xs text-secondary-500 dark:text-secondary-400">
                      SSH or HTTPS URL to your GitHub repository
                    </p>
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <input
                        type="checkbox"
                        id="useCustomSshKey"
                        checked={formData.useCustomSshKey}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          handleInputChange('useCustomSshKey', checked);
                          if (!checked) {
                            handleInputChange('sshKeyPath', '');
                          }
                        }}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <label htmlFor="useCustomSshKey" className="text-sm font-medium text-secondary-700 dark:text-secondary-200">
                        Set custom SSH key path
                      </label>
                    </div>
                    
                    {formData.useCustomSshKey && (
                      <div>
                        <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-200 mb-2">
                          SSH Key Path
                        </label>
                        <input
                          type="text"
                          value={formData.sshKeyPath || ''}
                          onChange={(e) => handleInputChange('sshKeyPath', e.target.value)}
                          className="w-full border border-secondary-300 dark:border-secondary-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white font-mono text-sm"
                          placeholder="/root/.ssh/id_ed25519"
                        />
                        <p className="mt-1 text-xs text-secondary-500 dark:text-secondary-400">
                          Path to your SSH deploy key. If not set, will auto-detect from common locations.
                        </p>
                        
                        <div className="mt-3">
                          <button
                            type="button"
                            onClick={testSshKey}
                            disabled={sshTestResult.testing || !formData.sshKeyPath || !formData.githubRepoUrl}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {sshTestResult.testing ? 'Testing...' : 'Test SSH Key'}
                          </button>
                          
                          {sshTestResult.success && (
                            <div className="mt-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                              <div className="flex items-center">
                                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mr-2" />
                                <p className="text-sm text-green-800 dark:text-green-200">
                                  {sshTestResult.message}
                                </p>
                              </div>
                            </div>
                          )}
                          
                          {sshTestResult.error && (
                            <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                              <div className="flex items-center">
                                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mr-2" />
                                <p className="text-sm text-red-800 dark:text-red-200">
                                  {sshTestResult.error}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {!formData.useCustomSshKey && (
                      <p className="text-xs text-secondary-500 dark:text-secondary-400">
                        Using auto-detection for SSH key location
                      </p>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-secondary-800 rounded-lg p-4 border border-secondary-200 dark:border-secondary-600">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                        <span className="text-sm font-medium text-secondary-700 dark:text-secondary-300">Current Version</span>
                      </div>
                      <span className="text-lg font-mono text-secondary-900 dark:text-white">{versionInfo.currentVersion}</span>
                    </div>
                    
                    <div className="bg-white dark:bg-secondary-800 rounded-lg p-4 border border-secondary-200 dark:border-secondary-600">
                      <div className="flex items-center gap-2 mb-2">
                        <Download className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-sm font-medium text-secondary-700 dark:text-secondary-300">Latest Version</span>
                      </div>
                      <span className="text-lg font-mono text-secondary-900 dark:text-white">
                        {versionInfo.checking ? (
                          <span className="text-blue-600 dark:text-blue-400">Checking...</span>
                        ) : versionInfo.latestVersion ? (
                          <span className={versionInfo.isUpdateAvailable ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}>
                            {versionInfo.latestVersion}
                            {versionInfo.isUpdateAvailable && ' (Update Available!)'}
                          </span>
                        ) : (
                          <span className="text-secondary-500 dark:text-secondary-400">Not checked</span>
                        )}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={checkForUpdates}
                        disabled={versionInfo.checking}
                        className="btn-primary flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        {versionInfo.checking ? 'Checking...' : 'Check for Updates'}
                      </button>
                    </div>
                    
                    {/* Save Button for Version Settings */}
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={!isDirty || updateSettingsMutation.isPending}
                      className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
                        !isDirty || updateSettingsMutation.isPending
                          ? 'bg-secondary-400 cursor-not-allowed'
                          : 'bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500'
                      }`}
                    >
                      {updateSettingsMutation.isPending ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Settings
                        </>
                      )}
                    </button>
                  </div>
                  
                  {versionInfo.error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
                      <div className="flex">
                        <AlertCircle className="h-5 w-5 text-red-400 dark:text-red-300" />
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Version Check Failed</h3>
                          <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                            {versionInfo.error}
                          </p>
                          {versionInfo.error.includes('private') && (
                            <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                              For private repositories, you may need to configure GitHub authentication or make the repository public.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Success Message for Version Settings */}
                  {updateSettingsMutation.isSuccess && (
                    <div className="bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-md p-4">
                      <div className="flex">
                        <CheckCircle className="h-5 w-5 text-green-400 dark:text-green-300" />
                        <div className="ml-3">
                          <p className="text-sm text-green-700 dark:text-green-300">Settings saved successfully!</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
            </div>
          )}
        </div>
      </div>

      {/* Agent Version Modal */}
      {showAgentVersionModal && (
        <AgentVersionModal
          isOpen={showAgentVersionModal}
          onClose={() => {
            setShowAgentVersionModal(false);
            setAgentVersionForm({ version: '', releaseNotes: '', scriptContent: '', isDefault: false });
          }}
          onSubmit={createAgentVersionMutation.mutate}
          isLoading={createAgentVersionMutation.isPending}
        />
      )}
    </div>
  );
};

// Agent Version Modal Component
const AgentVersionModal = ({ isOpen, onClose, onSubmit, isLoading }) => {
  const [formData, setFormData] = useState({
    version: '',
    releaseNotes: '',
    scriptContent: '',
    isDefault: false
  });
  const [errors, setErrors] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Basic validation
    const newErrors = {};
    if (!formData.version.trim()) newErrors.version = 'Version is required';
    if (!formData.scriptContent.trim()) newErrors.scriptContent = 'Script content is required';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    onSubmit(formData);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData(prev => ({ ...prev, scriptContent: event.target.result }));
      };
      reader.readAsText(file);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-secondary-200 dark:border-secondary-600">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-secondary-900 dark:text-white">Add Agent Version</h3>
            <button
              onClick={onClose}
              className="text-secondary-400 hover:text-secondary-600 dark:text-secondary-500 dark:hover:text-secondary-300"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="px-6 py-4">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-200 mb-1">
                Version *
              </label>
              <input
                type="text"
                value={formData.version}
                onChange={(e) => setFormData(prev => ({ ...prev, version: e.target.value }))}
                className={`block w-full border rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white ${
                  errors.version ? 'border-red-300 dark:border-red-500' : 'border-secondary-300 dark:border-secondary-600'
                }`}
                placeholder="e.g., 1.0.1"
              />
              {errors.version && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.version}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-200 mb-1">
                Release Notes
              </label>
              <textarea
                value={formData.releaseNotes}
                onChange={(e) => setFormData(prev => ({ ...prev, releaseNotes: e.target.value }))}
                rows={3}
                className="block w-full border border-secondary-300 dark:border-secondary-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white"
                placeholder="Describe what's new in this version..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-200 mb-1">
                Script Content *
              </label>
              <div className="space-y-2">
                <input
                  type="file"
                  accept=".sh"
                  onChange={handleFileUpload}
                  className="block w-full text-sm text-secondary-500 dark:text-secondary-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 dark:file:bg-primary-900 dark:file:text-primary-200"
                />
                <textarea
                  value={formData.scriptContent}
                  onChange={(e) => setFormData(prev => ({ ...prev, scriptContent: e.target.value }))}
                  rows={10}
                  className={`block w-full border rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white font-mono text-sm ${
                    errors.scriptContent ? 'border-red-300 dark:border-red-500' : 'border-secondary-300 dark:border-secondary-600'
                  }`}
                  placeholder="Paste the agent script content here..."
                />
                {errors.scriptContent && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.scriptContent}</p>
                )}
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isDefault"
                checked={formData.isDefault}
                onChange={(e) => setFormData(prev => ({ ...prev, isDefault: e.target.checked }))}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 dark:border-secondary-600 rounded"
              />
              <label htmlFor="isDefault" className="ml-2 block text-sm text-secondary-700 dark:text-secondary-200">
                Set as default version for new installations
              </label>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="btn-outline"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary"
            >
              {isLoading ? 'Creating...' : 'Create Version'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Settings;
