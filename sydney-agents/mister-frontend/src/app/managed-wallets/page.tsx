"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Bot,
  Wallet,
  Plus,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Shield,
  Activity,
  Clock,
  CheckCircle,
  FolderPlus,
  Folder,
  FolderOpen,
  Edit3,
  Trash2,
  Archive,
  ArchiveRestore,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  MoreVertical
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useWallet } from "@/contexts/WalletContext";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useManagedWalletIdentity } from "@/hooks/useUserIdentity";
import { MANAGED_WALLET_STORAGE_KEYS } from "@/lib/utils/userStorage";
import { apiClient } from "@/lib/api/client";

interface ManagedWallet {
  id: string;
  address: string;
  balance: number;
  totalValue: number;
  pnl: number;
  pnlPercent: number;
  positions: number;
  agentStatus: 'active' | 'paused' | 'stopped';
  lastActivity: string;
  createdAt: string;
  groupId?: string;
  isArchived?: boolean;
}

interface WalletGroup {
  id: string;
  name: string;
  color: string;
  createdAt: string;
  walletCount: number;
}

type ViewFilter = 'all' | 'active' | 'archived';
type OrganizeMode = 'view' | 'organize';

interface WalletCardProps {
  wallet: ManagedWallet;
  organizeMode: OrganizeMode;
  onSelect: (wallet: ManagedWallet) => void;
  onArchive: (walletId: string) => void;
  onMoveToGroup: (walletId: string, groupId: string | null) => void;
  groups: WalletGroup[];
  isSelected?: boolean;
  onToggleSelection?: (walletId: string) => void;
}

function WalletCard({ wallet, organizeMode, onSelect, onArchive, onMoveToGroup, groups, isSelected, onToggleSelection }: WalletCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={`cursor-pointer hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/50 ${
        wallet.isArchived ? 'opacity-60' : ''
      }`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {organizeMode === 'organize' && onToggleSelection && (
                <Checkbox
                  checked={isSelected || false}
                  onCheckedChange={() => onToggleSelection(wallet.id)}
                  className="h-5 w-5"
                />
              )}
              <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-blue-500/20 rounded-xl flex items-center justify-center">
                <Bot className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">
                  {wallet.address.substring(0, 12)}...{wallet.address.substring(-8)}
                </h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  Created {new Date(wallet.createdAt).toLocaleDateString()}
                  {wallet.isArchived && (
                    <>
                      <span>•</span>
                      <Archive className="w-3 h-3" />
                      <span>Archived</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-right">
                <div className="font-semibold">{wallet.balance.toFixed(2)} ADA</div>
                <div className="text-sm text-muted-foreground">
                  ${wallet.totalValue.toFixed(2)} USD
                </div>
              </div>

              <div className="text-right">
                <div className={`font-semibold flex items-center gap-1 ${
                  wallet.pnl >= 0 ? 'text-green-500' : 'text-red-500'
                }`}>
                  {wallet.pnl >= 0 ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {wallet.pnl >= 0 ? '+' : ''}${wallet.pnl.toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground">
                  {wallet.pnlPercent >= 0 ? '+' : ''}{wallet.pnlPercent.toFixed(2)}%
                </div>
              </div>

              <div className="text-center">
                <Badge
                  variant={wallet.agentStatus === 'active' ? 'default' : 'secondary'}
                  className="mb-2"
                >
                  {wallet.agentStatus}
                </Badge>
                <div className="text-xs text-muted-foreground">
                  {wallet.positions} positions
                </div>
              </div>

              {organizeMode === 'organize' ? (
                <div className="flex items-center gap-2">
                  {/* Move to Group */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Folder className="h-4 w-4 mr-2" />
                        Move
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => onMoveToGroup(wallet.id, null)}>
                        <Folder className="h-4 w-4 mr-2" />
                        Ungrouped
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {groups.map((group) => (
                        <DropdownMenuItem
                          key={group.id}
                          onClick={() => onMoveToGroup(wallet.id, group.id)}
                        >
                          <div
                            className="w-3 h-3 rounded-full mr-2"
                            style={{ backgroundColor: group.color }}
                          />
                          {group.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Archive */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onArchive(wallet.id)}
                  >
                    {wallet.isArchived ? (
                      <>
                        <ArchiveRestore className="h-4 w-4 mr-2" />
                        Restore
                      </>
                    ) : (
                      <>
                        <Archive className="h-4 w-4 mr-2" />
                        Archive
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => onSelect(wallet)}
                  className="min-w-[120px]"
                  disabled={wallet.isArchived}
                >
                  Select
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function ManagedWalletsPage() {
  const { mainWallet } = useWallet();
  const { user } = useAuth();
  const router = useRouter();

  // Enhanced user identification system
  const {
    userIdentity,
    isAuthenticated,
    isLoading: userLoading,
    userStorage,
    getManagedWalletApiIdentifier,
    getUserDisplayName,
  } = useManagedWalletIdentity();
  const [managedWallets, setManagedWallets] = useState<ManagedWallet[]>([]);
  const [walletGroups, setWalletGroups] = useState<WalletGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI State
  const [viewFilter, setViewFilter] = useState<ViewFilter>('active');
  const [organizeMode, setOrganizeMode] = useState<OrganizeMode>('view');
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [selectedWallets, setSelectedWallets] = useState<Set<string>>(new Set());

  // Dialog States
  const [isCreateGroupDialogOpen, setIsCreateGroupDialogOpen] = useState(false);
  const [isEditGroupDialogOpen, setIsEditGroupDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<WalletGroup | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupColor, setNewGroupColor] = useState('#3B82F6');

  // Default groups
  const defaultGroups: WalletGroup[] = [
    {
      id: 'active-trading',
      name: 'Active Trading',
      color: '#10B981',
      createdAt: new Date().toISOString(),
      walletCount: 0
    },
    {
      id: 'test-wallets',
      name: 'Test Wallets',
      color: '#F59E0B',
      createdAt: new Date().toISOString(),
      walletCount: 0
    },
    {
      id: 'strategy-a',
      name: 'Strategy A',
      color: '#8B5CF6',
      createdAt: new Date().toISOString(),
      walletCount: 0
    }
  ];

  useEffect(() => {
    // Load managed wallets using enhanced user identification
    if (isAuthenticated && !userLoading) {
      loadManagedWallets();
      initializeGroups();
    }
  }, [isAuthenticated, userLoading, userIdentity]);

  const initializeGroups = () => {
    // Initialize with default groups
    // In a real app, this would load from backend storage
    setWalletGroups(defaultGroups);
  };

  const loadManagedWallets = async () => {
    try {
      setIsLoading(true);

      // Use enhanced user identification system
      const identifier = getManagedWalletApiIdentifier();
      if (!identifier) {
        throw new Error('No valid user identifier found');
      }

      const userType = userIdentity?.type || 'unknown';
      console.log(`🔗 Loading managed wallets for ${userType} user:`,
        identifier.substring(0, 20) + '...');

      const data = await apiClient.get(`/api/wallets/managed/${identifier}`);

      if (data.success) {
        console.log(`✅ Loaded ${data.data.managedWallets.length} managed wallets`);

        // Load archive status from user-specific localStorage
        const archiveData = userStorage.getItem(MANAGED_WALLET_STORAGE_KEYS.ARCHIVE_STATUS);
        const archivedWallets = archiveData ? JSON.parse(archiveData) : {};

        // Apply archive status to wallets
        const walletsWithArchiveStatus = data.data.managedWallets.map((wallet: ManagedWallet) => ({
          ...wallet,
          isArchived: archivedWallets[wallet.id] || false
        }));

        setManagedWallets(walletsWithArchiveStatus);
      } else {
        setError(data.error || 'Failed to load managed wallets');
      }
    } catch (error) {
      console.error('Error loading managed wallets:', error);
      setError('Failed to load managed wallets');
    } finally {
      setIsLoading(false);
    }
  };

  const selectManagedWallet = (wallet: ManagedWallet) => {
    // Store selected managed wallet in user-specific localStorage
    userStorage.setItem(MANAGED_WALLET_STORAGE_KEYS.SELECTED_WALLET, JSON.stringify(wallet));
    // Navigate to managed dashboard
    router.push('/managed-dashboard');
  };

  const createNewManagedWallet = () => {
    router.push('/onboarding');
  };

  // Helper functions for grouping and filtering
  const getFilteredWallets = () => {
    let filtered = managedWallets;

    // Apply archive filter
    if (viewFilter === 'active') {
      filtered = filtered.filter(wallet => !wallet.isArchived);
    } else if (viewFilter === 'archived') {
      filtered = filtered.filter(wallet => wallet.isArchived);
    }

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(wallet =>
        wallet.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        wallet.id.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  };

  const getWalletsInGroup = (groupId: string | null) => {
    const filtered = getFilteredWallets();
    if (groupId === null) {
      // Ungrouped wallets
      return filtered.filter(wallet => !wallet.groupId);
    }
    return filtered.filter(wallet => wallet.groupId === groupId);
  };

  const updateWalletGroup = (walletId: string, groupId: string | null) => {
    setManagedWallets(prev =>
      prev.map(wallet =>
        wallet.id === walletId
          ? { ...wallet, groupId: groupId || undefined }
          : wallet
      )
    );
  };

  const toggleWalletArchive = (walletId: string) => {
    setManagedWallets(prev => {
      const updated = prev.map(wallet =>
        wallet.id === walletId
          ? { ...wallet, isArchived: !wallet.isArchived }
          : wallet
      );

      // Save archive status to user-specific localStorage
      const archiveData = updated.reduce((acc, wallet) => {
        if (wallet.isArchived) {
          acc[wallet.id] = true;
        }
        return acc;
      }, {} as Record<string, boolean>);

      userStorage.setItem(MANAGED_WALLET_STORAGE_KEYS.ARCHIVE_STATUS, JSON.stringify(archiveData));
      return updated;
    });
  };

  const createGroup = () => {
    if (!newGroupName.trim()) return;

    const newGroup: WalletGroup = {
      id: `group_${Date.now()}`,
      name: newGroupName.trim(),
      color: newGroupColor,
      createdAt: new Date().toISOString(),
      walletCount: 0
    };

    setWalletGroups(prev => [...prev, newGroup]);
    setNewGroupName('');
    setNewGroupColor('#3B82F6');
    setIsCreateGroupDialogOpen(false);
  };

  const deleteGroup = (groupId: string) => {
    // Move all wallets in this group to ungrouped
    setManagedWallets(prev =>
      prev.map(wallet =>
        wallet.groupId === groupId
          ? { ...wallet, groupId: undefined }
          : wallet
      )
    );

    // Remove the group
    setWalletGroups(prev => prev.filter(group => group.id !== groupId));
  };

  const toggleGroupCollapse = (groupId: string) => {
    setCollapsedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  // Bulk operations functions
  const toggleWalletSelection = (walletId: string) => {
    setSelectedWallets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(walletId)) {
        newSet.delete(walletId);
      } else {
        newSet.add(walletId);
      }
      return newSet;
    });
  };

  const selectAllWallets = () => {
    const visibleWallets = getFilteredWallets();
    setSelectedWallets(new Set(visibleWallets.map(w => w.id)));
  };

  const clearWalletSelection = () => {
    setSelectedWallets(new Set());
  };

  const bulkArchiveWallets = (archive: boolean) => {
    setManagedWallets(prev => {
      const updated = prev.map(wallet =>
        selectedWallets.has(wallet.id)
          ? { ...wallet, isArchived: archive }
          : wallet
      );

      // Save archive status to user-specific localStorage
      const archiveData = updated.reduce((acc, wallet) => {
        if (wallet.isArchived) {
          acc[wallet.id] = true;
        }
        return acc;
      }, {} as Record<string, boolean>);

      userStorage.setItem(MANAGED_WALLET_STORAGE_KEYS.ARCHIVE_STATUS, JSON.stringify(archiveData));
      return updated;
    });
    clearWalletSelection();
  };

  const bulkMoveWallets = (groupId: string | null) => {
    setManagedWallets(prev =>
      prev.map(wallet =>
        selectedWallets.has(wallet.id)
          ? { ...wallet, groupId: groupId || undefined }
          : wallet
      )
    );
    clearWalletSelection();
  };

  // Check if user has any form of authentication
  if (!mainWallet && !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8">
            <p>Please authenticate first</p>
            <div className="flex flex-col gap-2 mt-4">
              <Button onClick={() => router.push('/')} variant="default">
                Connect Wallet
              </Button>
              <Button onClick={() => router.push('/onboarding')} variant="outline">
                Continue with Email
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading your managed wallets...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Your Managed Wallets</h1>
              <p className="text-muted-foreground">
                {managedWallets.length} wallets • {getFilteredWallets().length} {viewFilter}
              </p>
            </div>
            <Badge variant="outline" className="flex items-center gap-1">
              <Wallet className="h-3 w-3" />
              {getUserDisplayName()}
            </Badge>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4 mt-4">
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search wallets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  {viewFilter === 'all' ? 'All' : viewFilter === 'active' ? 'Active' : 'Archived'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setViewFilter('active')}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Active Wallets
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setViewFilter('archived')}>
                  <Archive className="h-4 w-4 mr-2" />
                  Archived Wallets
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setViewFilter('all')}>
                  <Wallet className="h-4 w-4 mr-2" />
                  All Wallets
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Organize Mode */}
            <Button
              variant={organizeMode === 'organize' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setOrganizeMode(organizeMode === 'view' ? 'organize' : 'view');
                if (organizeMode === 'organize') {
                  clearWalletSelection();
                }
              }}
            >
              {organizeMode === 'organize' ? 'Done' : 'Organize'}
            </Button>

            {/* Bulk Operations */}
            {organizeMode === 'organize' && selectedWallets.size > 0 && (
              <>
                <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-md">
                  <span className="text-sm font-medium">{selectedWallets.size} selected</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearWalletSelection}
                    className="h-6 w-6 p-0"
                  >
                    ×
                  </Button>
                </div>

                {/* Bulk Archive */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Archive className="h-4 w-4 mr-2" />
                      Archive
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => bulkArchiveWallets(true)}>
                      <Archive className="h-4 w-4 mr-2" />
                      Archive Selected
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => bulkArchiveWallets(false)}>
                      <ArchiveRestore className="h-4 w-4 mr-2" />
                      Restore Selected
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Bulk Move */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Folder className="h-4 w-4 mr-2" />
                      Move
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => bulkMoveWallets(null)}>
                      <Folder className="h-4 w-4 mr-2" />
                      Ungrouped
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {walletGroups.map((group) => (
                      <DropdownMenuItem
                        key={group.id}
                        onClick={() => bulkMoveWallets(group.id)}
                      >
                        <div
                          className="w-3 h-3 rounded-full mr-2"
                          style={{ backgroundColor: group.color }}
                        />
                        {group.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}

            {/* Select All/None */}
            {organizeMode === 'organize' && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Select
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={selectAllWallets}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Select All Visible
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={clearWalletSelection}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Clear Selection
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Create Group */}
            <Dialog open={isCreateGroupDialogOpen} onOpenChange={setIsCreateGroupDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <FolderPlus className="h-4 w-4 mr-2" />
                  New Group
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Group</DialogTitle>
                  <DialogDescription>
                    Create a new group to organize your managed wallets.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">
                      Name
                    </Label>
                    <Input
                      id="name"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      className="col-span-3"
                      placeholder="e.g., Active Trading"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="color" className="text-right">
                      Color
                    </Label>
                    <Input
                      id="color"
                      type="color"
                      value={newGroupColor}
                      onChange={(e) => setNewGroupColor(e.target.value)}
                      className="col-span-3 h-10"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={createGroup}>Create Group</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          
          {/* Grouped Managed Wallets */}
          {getFilteredWallets().length > 0 && (
            <div className="space-y-6">
              {/* Groups */}
              {walletGroups.map((group) => {
                const walletsInGroup = getWalletsInGroup(group.id);
                if (walletsInGroup.length === 0) return null;

                return (
                  <div key={group.id} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleGroupCollapse(group.id)}
                          className="p-1 h-auto"
                        >
                          {collapsedGroups.has(group.id) ? (
                            <ChevronRight className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: group.color }}
                        />
                        <h3 className="text-lg font-semibold">{group.name}</h3>
                        <Badge variant="outline">{walletsInGroup.length}</Badge>
                      </div>

                      {organizeMode === 'organize' && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => {
                              setEditingGroup(group);
                              setNewGroupName(group.name);
                              setNewGroupColor(group.color);
                              setIsEditGroupDialogOpen(true);
                            }}>
                              <Edit3 className="h-4 w-4 mr-2" />
                              Edit Group
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => deleteGroup(group.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Group
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>

                    {!collapsedGroups.has(group.id) && (
                      <div className="grid gap-4 ml-6">
                        {walletsInGroup.map((wallet) => (
                          <WalletCard
                            key={wallet.id}
                            wallet={wallet}
                            organizeMode={organizeMode}
                            onSelect={selectManagedWallet}
                            onArchive={toggleWalletArchive}
                            onMoveToGroup={updateWalletGroup}
                            groups={walletGroups}
                            isSelected={selectedWallets.has(wallet.id)}
                            onToggleSelection={toggleWalletSelection}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Ungrouped Wallets */}
              {(() => {
                const ungroupedWallets = getWalletsInGroup(null);
                if (ungroupedWallets.length === 0) return null;

                return (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleGroupCollapse('ungrouped')}
                        className="p-1 h-auto"
                      >
                        {collapsedGroups.has('ungrouped') ? (
                          <ChevronRight className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                      <Folder className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-lg font-semibold text-muted-foreground">Ungrouped</h3>
                      <Badge variant="outline">{ungroupedWallets.length}</Badge>
                    </div>

                    {!collapsedGroups.has('ungrouped') && (
                      <div className="grid gap-4 ml-6">
                        {ungroupedWallets.map((wallet) => (
                          <WalletCard
                            key={wallet.id}
                            wallet={wallet}
                            organizeMode={organizeMode}
                            onSelect={selectManagedWallet}
                            onArchive={toggleWalletArchive}
                            onMoveToGroup={updateWalletGroup}
                            groups={walletGroups}
                            isSelected={selectedWallets.has(wallet.id)}
                            onToggleSelection={toggleWalletSelection}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Archived Wallets Section */}
          {(() => {
            const archivedWallets = managedWallets.filter(wallet => wallet.isArchived);
            if (archivedWallets.length === 0 || viewFilter === 'active') return null;

            return (
              <div className="space-y-3 mt-8">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleGroupCollapse('archived')}
                    className="p-1 h-auto"
                  >
                    {collapsedGroups.has('archived') ? (
                      <ChevronRight className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                  <Archive className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold text-muted-foreground">Archived Wallets</h3>
                  <Badge variant="outline">{archivedWallets.length}</Badge>
                </div>

                {!collapsedGroups.has('archived') && (
                  <div className="grid gap-4 ml-6">
                    {archivedWallets.map((wallet) => (
                      <WalletCard
                        key={wallet.id}
                        wallet={wallet}
                        organizeMode={organizeMode}
                        onSelect={selectManagedWallet}
                        onArchive={toggleWalletArchive}
                        onMoveToGroup={updateWalletGroup}
                        groups={walletGroups}
                        isSelected={selectedWallets.has(wallet.id)}
                        onToggleSelection={toggleWalletSelection}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Create New Managed Wallet */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">
              {managedWallets.length > 0 ? 'Create Another Managed Wallet' : 'Create Your First Managed Wallet'}
            </h2>
            
            <Card className="border-dashed border-2 hover:border-primary/50 transition-colors">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Plus className="w-8 h-8 text-primary" />
                </div>
                
                <h3 className="text-xl font-semibold mb-2">Create New Managed Wallet</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Set up a new managed wallet for automated trading with AI agents. 
                  Each wallet can have different strategies and risk settings.
                </p>

                <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground mb-6">
                  <div className="flex items-center gap-1">
                    <Shield className="w-4 h-4" />
                    <span>Secure</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Bot className="w-4 h-4" />
                    <span>AI Managed</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Activity className="w-4 h-4" />
                    <span>Automated</span>
                  </div>
                </div>

                <Button 
                  onClick={createNewManagedWallet}
                  size="lg"
                  className="min-w-[200px]"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Managed Wallet
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Error State */}
          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <p className="text-red-600">{error}</p>
                <Button 
                  variant="outline" 
                  onClick={loadManagedWallets}
                  className="mt-2"
                >
                  Retry
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Edit Group Dialog */}
      <Dialog open={isEditGroupDialogOpen} onOpenChange={setIsEditGroupDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Group</DialogTitle>
            <DialogDescription>
              Update the group name and color.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">
                Name
              </Label>
              <Input
                id="edit-name"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-color" className="text-right">
                Color
              </Label>
              <Input
                id="edit-color"
                type="color"
                value={newGroupColor}
                onChange={(e) => setNewGroupColor(e.target.value)}
                className="col-span-3 h-10"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => {
              if (editingGroup && newGroupName.trim()) {
                setWalletGroups(prev =>
                  prev.map(group =>
                    group.id === editingGroup.id
                      ? { ...group, name: newGroupName.trim(), color: newGroupColor }
                      : group
                  )
                );
                setIsEditGroupDialogOpen(false);
                setEditingGroup(null);
                setNewGroupName('');
                setNewGroupColor('#3B82F6');
              }
            }}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
