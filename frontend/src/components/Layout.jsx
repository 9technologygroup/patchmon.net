import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  Home, 
  Server, 
  Package, 
  Shield, 
  BarChart3,
  Menu,
  X,
  LogOut,
  User,
  Users,
  Settings,
  UserCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  RefreshCw,
  GitBranch,
  Wrench,
  Container,
  Plus
} from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { useUpdateNotification } from '../contexts/UpdateNotificationContext'
import { dashboardAPI, formatRelativeTime, versionAPI } from '../utils/api'
import UpgradeNotificationIcon from './UpgradeNotificationIcon'

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    // Load sidebar state from localStorage, default to false
    const saved = localStorage.getItem('sidebarCollapsed')
    return saved ? JSON.parse(saved) : false
  })
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const location = useLocation()
  const { user, logout, canViewHosts, canManageHosts, canViewPackages, canViewUsers, canManageUsers, canManageSettings } = useAuth()
  const { updateAvailable } = useUpdateNotification()
  const userMenuRef = useRef(null)

  // Fetch dashboard stats for the "Last updated" info
  const { data: stats, refetch } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: () => dashboardAPI.getStats().then(res => res.data),
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000, // Consider data stale after 30 seconds
  })

  // Fetch version info
  const { data: versionInfo } = useQuery({
    queryKey: ['versionInfo'],
    queryFn: () => versionAPI.getCurrent().then(res => res.data),
    staleTime: 300000, // Consider data stale after 5 minutes
  })

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home },
    {
      section: 'Inventory',
      items: [
        ...(canViewHosts() ? [{ name: 'Hosts', href: '/hosts', icon: Server }] : []),
        ...(canViewPackages() ? [{ name: 'Packages', href: '/packages', icon: Package }] : []),
        ...(canViewHosts() ? [{ name: 'Repos', href: '/repositories', icon: GitBranch }] : []),
        { name: 'Services', href: '/services', icon: Wrench, comingSoon: true },
        { name: 'Docker', href: '/docker', icon: Container, comingSoon: true },
        { name: 'Reporting', href: '/reporting', icon: BarChart3, comingSoon: true },
      ]
    },
    {
      section: 'PatchMon Users',
      items: [
        ...(canViewUsers() ? [{ name: 'Users', href: '/users', icon: Users }] : []),
        ...(canManageSettings() ? [{ name: 'Permissions', href: '/permissions', icon: Shield }] : []),
      ]
    },
    {
      section: 'Settings',
      items: [
        ...(canManageSettings() ? [{ 
          name: 'Server Config', 
          href: '/settings', 
          icon: Settings,
          showUpgradeIcon: updateAvailable
        }] : []),
        ...(canManageHosts() ? [{ 
          name: 'Options', 
          href: '/options', 
          icon: Settings
        }] : []),
      ]
    }
  ]

  const isActive = (path) => location.pathname === path

  // Get page title based on current route
  const getPageTitle = () => {
    const path = location.pathname
    
    if (path === '/') return 'Dashboard'
    if (path === '/hosts') return 'Hosts'
    if (path === '/packages') return 'Packages'
    if (path === '/repositories' || path.startsWith('/repositories/')) return 'Repositories'
    if (path === '/services') return 'Services'
    if (path === '/docker') return 'Docker'
    if (path === '/users') return 'Users'
    if (path === '/permissions') return 'Permissions'
    if (path === '/settings') return 'Settings'
    if (path === '/options') return 'Options'
    if (path === '/profile') return 'My Profile'
    if (path.startsWith('/hosts/')) return 'Host Details'
    if (path.startsWith('/packages/')) return 'Package Details'
    
    return 'PatchMon'
  }

  const handleLogout = async () => {
    await logout()
    setUserMenuOpen(false)
  }

  const handleAddHost = () => {
    // Navigate to hosts page with add modal parameter
    window.location.href = '/hosts?action=add'
  }

  // Short format for navigation area
  const formatRelativeTimeShort = (date) => {
    const now = new Date()
    const diff = now - new Date(date)
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return `${seconds}s ago`
  }

  // Save sidebar collapsed state to localStorage
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(sidebarCollapsed))
  }, [sidebarCollapsed])

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  return (
    <div className="min-h-screen bg-secondary-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-secondary-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="relative flex w-full max-w-xs flex-col bg-white pb-4 pt-5 shadow-xl">
          <div className="absolute right-0 top-0 -mr-12 pt-2">
            <button
              type="button"
              className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-6 w-6 text-white" />
            </button>
          </div>
          <div className="flex flex-shrink-0 items-center px-4">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-primary-600" />
              <h1 className="ml-2 text-xl font-bold text-secondary-900 dark:text-white">PatchMon</h1>
            </div>
          </div>
          <nav className="mt-8 flex-1 space-y-6 px-2">
            {navigation.map((item, index) => {
              if (item.name) {
                // Single item (Dashboard)
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                      isActive(item.href)
                        ? 'bg-primary-100 text-primary-900'
                        : 'text-secondary-600 hover:bg-secondary-50 hover:text-secondary-900'
                    }`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <item.icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </Link>
                )
              } else if (item.section) {
                // Section with items
                return (
                  <div key={item.section}>
                    <h3 className="text-xs font-semibold text-secondary-500 uppercase tracking-wider mb-2 px-2">
                      {item.section}
                    </h3>
                    <div className="space-y-1">
                      {item.items.map((subItem) => (
                        <div key={subItem.name}>
                          {subItem.name === 'Hosts' && canManageHosts() ? (
                            // Special handling for Hosts item with integrated + button (mobile)
                            <Link
                              to={subItem.href}
                              className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                                isActive(subItem.href)
                                  ? 'bg-primary-100 text-primary-900'
                                  : 'text-secondary-600 hover:bg-secondary-50 hover:text-secondary-900'
                              }`}
                              onClick={() => setSidebarOpen(false)}
                            >
                              <subItem.icon className="mr-3 h-5 w-5" />
                              <span className="flex items-center gap-2 flex-1">
                                {subItem.name}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.preventDefault()
                                  setSidebarOpen(false)
                                  handleAddHost()
                                }}
                                className="ml-auto flex items-center justify-center w-5 h-5 rounded-full border-2 border-current opacity-60 hover:opacity-100 transition-all duration-200 self-center"
                                title="Add Host"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </Link>
                          ) : (
                            // Standard navigation item (mobile)
                            <Link
                              to={subItem.href}
                              className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                                isActive(subItem.href)
                                  ? 'bg-primary-100 text-primary-900'
                                  : 'text-secondary-600 hover:bg-secondary-50 hover:text-secondary-900'
                              } ${subItem.comingSoon ? 'opacity-50 cursor-not-allowed' : ''}`}
                              onClick={subItem.comingSoon ? (e) => e.preventDefault() : () => setSidebarOpen(false)}
                            >
                              <subItem.icon className="mr-3 h-5 w-5" />
                              <span className="flex items-center gap-2">
                                {subItem.name}
                                {subItem.comingSoon && (
                                  <span className="text-xs bg-secondary-100 text-secondary-600 px-1.5 py-0.5 rounded">
                                    Soon
                                  </span>
                                )}
                              </span>
                            </Link>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              }
              return null
            })}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className={`hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:flex-col transition-all duration-300 ${
        sidebarCollapsed ? 'lg:w-16' : 'lg:w-64'
      } bg-white dark:bg-secondary-800`}>
        <div className={`flex grow flex-col gap-y-5 overflow-y-auto border-r border-secondary-200 dark:border-secondary-600 bg-white dark:bg-secondary-800 ${
          sidebarCollapsed ? 'px-2 shadow-lg' : 'px-6'
        }`}>
          <div className={`flex h-16 shrink-0 items-center border-b border-secondary-200 ${
            sidebarCollapsed ? 'justify-center' : 'justify-between'
          }`}>
            {sidebarCollapsed ? (
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-secondary-100 transition-colors"
                title="Expand sidebar"
              >
                <ChevronRight className="h-5 w-5 text-secondary-700 dark:text-white" />
              </button>
            ) : (
              <>
                <div className="flex items-center">
                  <Shield className="h-8 w-8 text-primary-600" />
                  <h1 className="ml-2 text-xl font-bold text-secondary-900 dark:text-white">PatchMon</h1>
                </div>
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-secondary-100 transition-colors"
                  title="Collapse sidebar"
                >
                  <ChevronLeft className="h-5 w-5 text-secondary-700 dark:text-white" />
                </button>
              </>
            )}
          </div>
          <nav className="flex flex-1 flex-col">
            <ul className="flex flex-1 flex-col gap-y-6">
              {navigation.map((item, index) => {
                if (item.name) {
                  // Single item (Dashboard)
                  return (
                    <li key={item.name}>
                      <Link
                        to={item.href}
                        className={`group flex gap-x-3 rounded-md text-sm leading-6 font-semibold transition-all duration-200 ${
                          isActive(item.href)
                            ? 'bg-primary-50 dark:bg-primary-600 text-primary-700 dark:text-white'
                            : 'text-secondary-700 dark:text-secondary-200 hover:text-primary-700 dark:hover:text-primary-300 hover:bg-secondary-50 dark:hover:bg-secondary-700'
                        } ${sidebarCollapsed ? 'justify-center p-2' : 'p-2'}`}
                        title={sidebarCollapsed ? item.name : ''}
                      >
                        <item.icon className={`h-5 w-5 shrink-0 ${sidebarCollapsed ? 'mx-auto' : ''}`} />
                        {!sidebarCollapsed && (
                          <span className="truncate">{item.name}</span>
                        )}
                      </Link>
                    </li>
                  )
                } else if (item.section) {
                  // Section with items
                  return (
                    <li key={item.section}>
                      {!sidebarCollapsed && (
                        <h3 className="text-xs font-semibold text-secondary-500 dark:text-secondary-300 uppercase tracking-wider mb-2 px-2">
                          {item.section}
                        </h3>
                      )}
                      <ul className={`space-y-1 ${sidebarCollapsed ? '' : '-mx-2'}`}>
                        {item.items.map((subItem) => (
                          <li key={subItem.name}>
                            {subItem.name === 'Hosts' && canManageHosts() ? (
                              // Special handling for Hosts item with integrated + button
                              <div className="flex items-center gap-1">
                                <Link
                                  to={subItem.href}
                                  className={`group flex gap-x-3 rounded-md text-sm leading-6 font-medium transition-all duration-200 flex-1 ${
                                    isActive(subItem.href)
                                      ? 'bg-primary-50 dark:bg-primary-600 text-primary-700 dark:text-white'
                                      : 'text-secondary-700 dark:text-secondary-200 hover:text-primary-700 dark:hover:text-primary-300 hover:bg-secondary-50 dark:hover:bg-secondary-700'
                                  } ${sidebarCollapsed ? 'justify-center p-2' : 'p-2'}`}
                                  title={sidebarCollapsed ? subItem.name : ''}
                                >
                                  <subItem.icon className={`h-5 w-5 shrink-0 ${sidebarCollapsed ? 'mx-auto' : ''}`} />
                                  {!sidebarCollapsed && (
                                    <span className="truncate flex items-center gap-2 flex-1">
                                      {subItem.name}
                                    </span>
                                  )}
                                  {!sidebarCollapsed && (
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault()
                                        handleAddHost()
                                      }}
                                      className="ml-auto flex items-center justify-center w-5 h-5 rounded-full border-2 border-current opacity-60 hover:opacity-100 transition-all duration-200 self-center"
                                      title="Add Host"
                                    >
                                      <Plus className="h-3 w-3" />
                                    </button>
                                  )}
                                </Link>
                              </div>
                            ) : (
                              // Standard navigation item
                              <Link
                                to={subItem.href}
                                className={`group flex gap-x-3 rounded-md text-sm leading-6 font-medium transition-all duration-200 ${
                                  isActive(subItem.href)
                                    ? 'bg-primary-50 dark:bg-primary-600 text-primary-700 dark:text-white'
                                    : 'text-secondary-700 dark:text-secondary-200 hover:text-primary-700 dark:hover:text-primary-300 hover:bg-secondary-50 dark:hover:bg-secondary-700'
                                } ${sidebarCollapsed ? 'justify-center p-2 relative' : 'p-2'} ${
                                  subItem.comingSoon ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                                title={sidebarCollapsed ? subItem.name : ''}
                                onClick={subItem.comingSoon ? (e) => e.preventDefault() : undefined}
                              >
                                <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : ''}`}>
                                  <subItem.icon className={`h-5 w-5 shrink-0 ${sidebarCollapsed ? 'mx-auto' : ''}`} />
                                  {sidebarCollapsed && subItem.showUpgradeIcon && (
                                    <UpgradeNotificationIcon className="h-3 w-3 absolute -top-1 -right-1" />
                                  )}
                                </div>
                                {!sidebarCollapsed && (
                                  <span className="truncate flex items-center gap-2">
                                    {subItem.name}
                                    {subItem.comingSoon && (
                                      <span className="text-xs bg-secondary-100 text-secondary-600 px-1.5 py-0.5 rounded">
                                        Soon
                                      </span>
                                    )}
                                    {subItem.showUpgradeIcon && (
                                      <UpgradeNotificationIcon className="h-3 w-3" />
                                    )}
                                  </span>
                                )}
                              </Link>
                            )}
                          </li>
                        ))}
                      </ul>
                    </li>
                  )
                }
                return null
              })}
            </ul>
          </nav>
          
          {/* Profile Section - Bottom of Sidebar */}
          <div className="border-t border-secondary-200 dark:border-secondary-600">
            {!sidebarCollapsed ? (
              <div>
              {/* User Info with Sign Out - Username is clickable */}
                <div className="flex items-center justify-between p-2">
                  <Link 
                    to="/profile"
                    className={`flex-1 min-w-0 rounded-md p-2 transition-all duration-200 ${
                      isActive('/profile')
                        ? 'bg-primary-50 dark:bg-primary-600'
                        : 'hover:bg-secondary-50 dark:hover:bg-secondary-700'
                    }`}
                  >
                    <div className="flex items-center gap-x-3">
                      <UserCircle className={`h-5 w-5 shrink-0 ${
                        isActive('/profile')
                          ? 'text-primary-700 dark:text-white'
                          : 'text-secondary-500 dark:text-secondary-400'
                      }`} />
                      <div className="flex items-center gap-x-2">
                        <span className={`text-sm leading-6 font-semibold truncate ${
                          isActive('/profile')
                            ? 'text-primary-700 dark:text-white'
                            : 'text-secondary-700 dark:text-secondary-200'
                        }`}>
                          {user?.username}
                        </span>
                        {user?.role === 'admin' && (
                          <span className="inline-flex items-center rounded-full bg-primary-100 px-1.5 py-0.5 text-xs font-medium text-primary-800">
                            Admin
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="ml-2 p-1.5 text-secondary-400 hover:text-secondary-600 hover:bg-secondary-100 rounded transition-colors"
                    title="Sign out"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
                {/* Updated info */}
                {stats && (
                  <div className="px-2 py-1 border-t border-secondary-200 dark:border-secondary-700">
                    <div className="flex items-center gap-x-1 text-xs text-secondary-500 dark:text-secondary-400">
                      <Clock className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">Updated: {formatRelativeTimeShort(stats.lastUpdated)}</span>
                      <button
                        onClick={() => refetch()}
                        className="p-1 hover:bg-secondary-100 dark:hover:bg-secondary-700 rounded flex-shrink-0"
                        title="Refresh data"
                      >
                        <RefreshCw className="h-3 w-3" />
                      </button>
                      {versionInfo && (
                        <span className="text-xs text-secondary-400 dark:text-secondary-500 flex-shrink-0">
                          v{versionInfo.version}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                <Link
                  to="/profile"
                  className={`flex items-center justify-center p-2 rounded-md transition-colors ${
                    isActive('/profile')
                      ? 'bg-primary-50 dark:bg-primary-600 text-primary-700 dark:text-white'
                      : 'text-secondary-700 dark:text-secondary-200 hover:bg-secondary-50 dark:hover:bg-secondary-700'
                  }`}
                  title={`My Profile (${user?.username})`}
                >
                  <UserCircle className="h-5 w-5" />
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center justify-center w-full p-2 text-secondary-400 hover:text-secondary-600 hover:bg-secondary-100 dark:hover:bg-secondary-700 rounded-md transition-colors"
                  title="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
                {/* Updated info for collapsed sidebar */}
                {stats && (
                  <div className="flex flex-col items-center py-1 border-t border-secondary-200 dark:border-secondary-700">
                    <button
                      onClick={() => refetch()}
                      className="p-1 hover:bg-secondary-100 dark:hover:bg-secondary-700 rounded"
                      title={`Refresh data - Updated: ${formatRelativeTimeShort(stats.lastUpdated)}`}
                    >
                      <RefreshCw className="h-3 w-3" />
                    </button>
                    {versionInfo && (
                      <span className="text-xs text-secondary-400 dark:text-secondary-500 mt-1">
                        v{versionInfo.version}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className={`flex flex-col min-h-screen transition-all duration-300 ${
        sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64'
      }`}>
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-secondary-200 dark:border-secondary-600 bg-white dark:bg-secondary-800 px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-secondary-700 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>

          {/* Separator */}
          <div className="h-6 w-px bg-secondary-200 lg:hidden" />

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="relative flex flex-1 items-center">
              <h2 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100">
                {getPageTitle()}
              </h2>
            </div>
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              {/* Customize Dashboard Button - Only show on Dashboard page */}
              {location.pathname === '/' && (
                <button
                  onClick={() => {
                    // This will be handled by the Dashboard component
                    const event = new CustomEvent('openDashboardSettings');
                    window.dispatchEvent(event);
                  }}
                  className="btn-outline flex items-center gap-2"
                >
                  <Settings className="h-4 w-4" />
                  Customize Dashboard
                </button>
              )}
            </div>
          </div>
        </div>

        <main className="flex-1 py-6 bg-secondary-50 dark:bg-secondary-800">
          <div className="px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

export default Layout 