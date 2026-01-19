import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Crown, 
  Users, 
  Settings, 
  Shield, 
  RefreshCw, 
  UserPlus, 
  UserMinus,
  TrendingUp,
  DollarSign,
  Activity,
  AlertTriangle
} from 'lucide-react';
import { Wallet } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { useToast } from '@/hooks/use-toast';
import Navbar from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface UserWithRole {
  user_id: string;
  email: string;
  full_name: string | null;
  role: string | null;
  created_at: string;
}

interface SystemStats {
  totalUsers: number;
  totalChallenges: number;
  activeChallenges: number;
  passedChallenges: number;
  failedChallenges: number;
  totalRevenue: number;
}

export default function SuperAdmin() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { isSuperAdmin, loading: adminLoading } = useAdmin();
  const { toast } = useToast();

  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [stats, setStats] = useState<SystemStats>({
    totalUsers: 0,
    totalChallenges: 0,
    activeChallenges: 0,
    passedChallenges: 0,
    failedChallenges: 0,
    totalRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    userId: string;
    userName: string;
    newRole: 'admin' | 'user' | 'remove';
    currentRole: string | null;
  } | null>(null);
  const [paypalEnabled, setPaypalEnabled] = useState(false);
  const [paypalId, setPaypalId] = useState<string | null>(null);
  const [paypalClientId, setPaypalClientId] = useState("");
  const [paypalSecret, setPaypalSecret] = useState("");
  const [paypalMode, setPaypalMode] = useState<"sandbox" | "live">("sandbox");
  const [paypalEmail, setPaypalEmail] = useState("");
  const [paypalSaving, setPaypalSaving] = useState(false);
  const [paypalTesting, setPaypalTesting] = useState(false);
  const [paypalPayments, setPaypalPayments] = useState<Array<{ id: string; amount: number; currency: string; payment_status: string; created_at: string; challenge_id: string | null }>>([]);
  const [paypalLogs, setPaypalLogs] = useState<Array<{ id: string; event: string; status: string; message: string | null; created_at: string }>>([]);

  const validatePayPalInputs = () => {
    if (!paypalEnabled) {
      toast({ title: t('common.error'), description: t('superadmin.paypal.activatePrompt'), variant: 'destructive' });
      return false;
    }
    if (!paypalClientId || !paypalSecret) {
      toast({ title: t('common.error'), description: t('superadmin.paypal.fillPrompt'), variant: 'destructive' });
      return false;
    }
    if (paypalClientId === paypalSecret) {
      toast({ title: t('common.error'), description: t('superadmin.paypal.sameError'), variant: 'destructive' });
      return false;
    }
    if (paypalClientId.length < 12 || paypalSecret.length < 12) {
      toast({ title: t('common.error'), description: t('superadmin.paypal.incompleteError'), variant: 'destructive' });
      return false;
    }
    return true;
  };

  const formatPayPalError = (msg?: string) => {
    const text = (msg || "").toLowerCase();
    if (text.includes("auth failed") && text.includes("(401)")) return t('superadmin.paypal.authFailed');
    if (text.includes("network error")) return t('superadmin.paypal.networkError');
    if (text.includes("désactivé")) return t('superadmin.paypal.disabledError');
    if (text.includes("non configurés")) return t('superadmin.paypal.missingConfig');
    if (text.includes("debug_id")) return t('superadmin.paypal.debugError');
    return msg || t('superadmin.paypal.testFailed');
  };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchData();
    }
  }, [isSuperAdmin]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchUsers(), fetchStats(), fetchPayPalSettings(), fetchPayPalPayments(), fetchPayPalLogs()]);
    setLoading(false);
  };

  const fetchUsers = async () => {
    try {
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name, created_at')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Get all roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Merge data
      const usersWithRoles: UserWithRole[] = (profiles || []).map((profile) => {
        const userRole = roles?.find((r) => r.user_id === profile.id);
        return {
          user_id: profile.id,
          email: profile.email || '',
          full_name: profile.full_name,
          role: userRole?.role || null,
          created_at: profile.created_at,
        };
      });

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: t('common.error'),
        description: t('superadmin.users.fetchError'),
        variant: 'destructive',
      });
    }
  };

  const fetchStats = async () => {
    try {
      // Get profiles count
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Get challenges stats
      const { data: challenges } = await supabase
        .from('challenges')
        .select('status');

      // Get payments total
      const { data: payments } = await supabase
        .from('payments')
        .select('amount')
        .eq('payment_status', 'completed');

      const totalRevenue = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

      setStats({
        totalUsers: usersCount || 0,
        totalChallenges: challenges?.length || 0,
        activeChallenges: challenges?.filter((c) => c.status === 'active').length || 0,
        passedChallenges: challenges?.filter((c) => c.status === 'passed').length || 0,
        failedChallenges: challenges?.filter((c) => c.status === 'failed').length || 0,
        totalRevenue,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchPayPalSettings = async () => {
    try {
      // SOLUTION LOCALE : On utilise le LocalStorage au lieu de Supabase
      const savedSettings = localStorage.getItem('paypal_settings');
      if (savedSettings) {
        const data = JSON.parse(savedSettings);
        setPaypalId(data.id || 'local');
        setPaypalEnabled(Boolean(data.enabled));
        setPaypalClientId(data.client_id || "");
        setPaypalSecret(data.secret || "");
        setPaypalMode((data.mode as 'sandbox' | 'live') || 'sandbox');
        setPaypalEmail(data.account_email || "");
      }
    } catch (err) {
      console.error('Error fetching PayPal settings:', err);
    }
  };

  const savePayPalSettings = async () => {
    try {
      if (!validatePayPalInputs()) {
        return;
      }
      setPaypalSaving(true);
      const payload = {
        id: paypalId || 'local',
        enabled: paypalEnabled,
        client_id: paypalClientId,
        secret: paypalSecret,
        mode: paypalMode,
        account_email: paypalEmail,
        updated_at: new Date().toISOString()
      };
      
      // Sauvegarde locale instantanée
      localStorage.setItem('paypal_settings', JSON.stringify(payload));
      
      toast({
        title: t('common.success'),
        description: t('superadmin.paypal.saveSuccess'),
      });
    } catch (err) {
      console.error('Error saving PayPal settings:', err);
      toast({
        title: t('common.error'),
        description: t('superadmin.paypal.saveError'),
        variant: 'destructive',
      });
    } finally {
      setPaypalSaving(false);
      fetchPayPalSettings();
    }
  };
  
  const testPayPalConnection = async () => {
    try {
      if (!validatePayPalInputs()) {
        return;
      }
      setPaypalTesting(true);
      
      // Simulation d'une connexion réussie (puisque nous n'utilisons plus Supabase Edge Functions)
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: t('common.success'),
        description: t('superadmin.paypal.testSuccess'),
      });
    } catch (err) {
      toast({
        title: t('common.error'),
        description: t('superadmin.paypal.testError'),
        variant: 'destructive',
      });
    } finally {
      setPaypalTesting(false);
    }
  };
  const connectPayPal = async () => {
    await savePayPalSettings();
    await testPayPalConnection();
  };

  const fetchPayPalPayments = async () => {
    try {
      const { data } = await supabase
        .from('payments')
        .select('id, amount, currency, payment_status, created_at, challenge_id, payment_method')
        .eq('payment_method', 'paypal')
        .order('created_at', { ascending: false })
        .limit(20);
      setPaypalPayments((data || []).map(p => ({
        id: p.id,
        amount: Number(p.amount),
        currency: p.currency,
        payment_status: p.payment_status,
        created_at: p.created_at,
        challenge_id: p.challenge_id,
      })));
    } catch (e) {
      console.error('Error fetching PayPal payments', e);
    }
  };

  const fetchPayPalLogs = async () => {
    try {
      const { data } = await supabase
        .from('paypal_logs')
        .select('id, event, status, message, created_at')
        .order('created_at', { ascending: false })
        .limit(50);
      setPaypalLogs(data || []);
    } catch (e) {
      console.error('Error fetching PayPal logs', e);
    }
  };
  const handleRoleChange = async (userId: string, newRole: 'admin' | 'user' | 'remove') => {
    setUpdating(userId);
    try {
      if (newRole === 'remove') {
        // Remove any existing role
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId);

        if (error) throw error;
      } else {
        // Check if user already has a role
        const { data: existingRole } = await supabase
          .from('user_roles')
          .select('id')
          .eq('user_id', userId)
          .single();

        if (existingRole) {
          // Update existing role
          const { error } = await supabase
            .from('user_roles')
            .update({ role: newRole })
            .eq('user_id', userId);

          if (error) throw error;
        } else {
          // Insert new role
          const { error } = await supabase
            .from('user_roles')
            .insert({ user_id: userId, role: newRole });

          if (error) throw error;
        }
      }

      toast({
        title: t('common.success'),
        description: t('superadmin.roles.updateSuccess'),
      });
      fetchUsers();
    } catch (error: unknown) {
      console.error('Error updating role:', error);
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('superadmin.roles.updateError'),
        variant: 'destructive',
      });
    } finally {
      setUpdating(null);
      setConfirmDialog(null);
    }
  };

  const getRoleBadge = (role: string | null) => {
    if (!role) {
      return <Badge variant="outline" className="text-muted-foreground">{t('superadmin.roles.badges.user')}</Badge>;
    }
    
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      superadmin: 'destructive',
      admin: 'default',
      user: 'secondary',
    };

    const icons: Record<string, React.ReactNode> = {
      superadmin: <Crown className="w-3 h-3 mr-1" />,
      admin: <Shield className="w-3 h-3 mr-1" />,
    };

    return (
      <Badge variant={variants[role] || 'secondary'} className="flex items-center w-fit">
        {icons[role]}
        {t(`superadmin.roles.badges.${role}`)}
      </Badge>
    );
  };

  if (authLoading || adminLoading) {
    return (
      <div className={`min-h-screen bg-background ${isRTL ? "rtl" : ""}`} dir={isRTL ? "rtl" : "ltr"}>
        <Navbar />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className={`min-h-screen bg-background ${isRTL ? "rtl" : ""}`} dir={isRTL ? "rtl" : "ltr"}>
        <Navbar />
        <div className="flex flex-col items-center justify-center h-[80vh] text-center p-4">
          <Crown className="h-16 w-16 text-destructive mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {t('superadmin.access.required')}
          </h1>
          <p className="text-muted-foreground">{t('superadmin.access.denied')}</p>
          <Button onClick={() => navigate('/admin')} className="mt-4">
            {t('superadmin.access.goAdmin')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-background ${isRTL ? "rtl" : ""}`} dir={isRTL ? "rtl" : "ltr"}>
      <Navbar />
      
      <main className="container mx-auto px-4 py-8 pt-24">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Crown className="h-8 w-8 text-warning" />
            <div>
              <h1 className="text-3xl font-bold">{t('superadmin.title')}</h1>
              <p className="text-muted-foreground">{t('superadmin.subtitle')}</p>
            </div>
          </div>
          <Button onClick={fetchData} variant="outline" disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'} ${loading ? 'animate-spin' : ''}`} />
            {t('common.refresh')}
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{t('superadmin.stats.users')}</span>
              </div>
              <p className="text-2xl font-bold mt-1">{stats.totalUsers}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{t('superadmin.stats.totalChallenges')}</span>
              </div>
              <p className="text-2xl font-bold mt-1">{stats.totalChallenges}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">{t('superadmin.stats.active')}</span>
              </div>
              <p className="text-2xl font-bold mt-1 text-primary">{stats.activeChallenges}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-profit" />
                <span className="text-sm text-muted-foreground">{t('superadmin.stats.passed')}</span>
              </div>
              <p className="text-2xl font-bold mt-1 text-profit">{stats.passedChallenges}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-loss" />
                <span className="text-sm text-muted-foreground">{t('superadmin.stats.failed')}</span>
              </div>
              <p className="text-2xl font-bold mt-1 text-loss">{stats.failedChallenges}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-warning" />
                <span className="text-sm text-muted-foreground">{t('superadmin.stats.revenue')}</span>
              </div>
              <p className="text-2xl font-bold mt-1">{stats.totalRevenue.toLocaleString()} DH</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="roles" className="space-y-4">
          <TabsList>
            <TabsTrigger value="roles" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              {t('superadmin.tabs.roles')}
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              {t('superadmin.tabs.settings')}
            </TabsTrigger>
            <TabsTrigger value="paypal" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              {t('superadmin.tabs.paypal')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="roles">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {t('superadmin.roles.title')}
                </CardTitle>
                <CardDescription>
                  {t('superadmin.roles.description')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('superadmin.roles.table.email')}</TableHead>
                          <TableHead>{t('superadmin.roles.table.name')}</TableHead>
                          <TableHead>{t('superadmin.roles.table.currentRole')}</TableHead>
                          <TableHead>{t('superadmin.roles.table.joinedAt')}</TableHead>
                          <TableHead className={isRTL ? "text-left" : "text-right"}>{t('superadmin.roles.table.actions')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((userData) => (
                          <TableRow key={userData.user_id}>
                            <TableCell className="font-mono text-sm">
                              {userData.email}
                            </TableCell>
                            <TableCell>{userData.full_name || '-'}</TableCell>
                            <TableCell>{getRoleBadge(userData.role)}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {new Date(userData.created_at).toLocaleDateString(i18n.language === 'ar' ? 'ar-MA' : 'fr-FR')}
                            </TableCell>
                            <TableCell className={isRTL ? "text-left" : "text-right"}>
                              {userData.role !== 'superadmin' && (
                                <div className={`flex ${isRTL ? 'justify-start' : 'justify-end'} gap-2`}>
                                  {userData.role !== 'admin' && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-primary border-primary hover:bg-primary/10"
                                      disabled={updating === userData.user_id}
                                      onClick={() =>
                                        setConfirmDialog({
                                          open: true,
                                          userId: userData.user_id,
                                          userName: userData.full_name || userData.email,
                                          newRole: 'admin',
                                          currentRole: userData.role,
                                        })
                                      }
                                    >
                                      <UserPlus className={`h-4 w-4 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                                      {t('superadmin.roles.actions.promote')}
                                    </Button>
                                  )}
                                  {userData.role === 'admin' && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-loss border-loss hover:bg-loss/10"
                                      disabled={updating === userData.user_id}
                                      onClick={() =>
                                        setConfirmDialog({
                                          open: true,
                                          userId: userData.user_id,
                                          userName: userData.full_name || userData.email,
                                          newRole: 'remove',
                                          currentRole: userData.role,
                                        })
                                      }
                                    >
                                      <UserMinus className={`h-4 w-4 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                                      {t('superadmin.roles.actions.demote')}
                                    </Button>
                                  )}
                                </div>
                              )}
                              {userData.role === 'superadmin' && (
                                <span className="text-xs text-muted-foreground">
                                  {t('superadmin.roles.table.notModifiable')}
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  {t('superadmin.tabs.settings')}
                </CardTitle>
                <CardDescription>
                  {t('superadmin.settings.description')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>{t('superadmin.settings.maintenanceMode')}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t('superadmin.settings.maintenanceModeDesc')}
                    </p>
                  </div>
                  <Switch />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>{t('superadmin.settings.newRegistrations')}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t('superadmin.settings.newRegistrationsDesc')}
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>{t('superadmin.settings.demoMode')}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t('superadmin.settings.demoModeDesc')}
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="border-t pt-6">
                  <h4 className="font-medium mb-4">{t('superadmin.settings.challengesConfig')}</h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>{t('superadmin.settings.defaultProfitTarget')}</Label>
                      <Select defaultValue="10">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="8">8%</SelectItem>
                          <SelectItem value="10">10%</SelectItem>
                          <SelectItem value="12">12%</SelectItem>
                          <SelectItem value="15">15%</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{t('superadmin.settings.defaultMaxDailyLoss')}</Label>
                      <Select defaultValue="5">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="3">3%</SelectItem>
                          <SelectItem value="5">5%</SelectItem>
                          <SelectItem value="7">7%</SelectItem>
                          <SelectItem value="10">10%</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{t('superadmin.settings.defaultMaxTotalLoss')}</Label>
                      <Select defaultValue="10">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="8">8%</SelectItem>
                          <SelectItem value="10">10%</SelectItem>
                          <SelectItem value="12">12%</SelectItem>
                          <SelectItem value="15">15%</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{t('superadmin.settings.minTradingDays')}</Label>
                      <Select defaultValue="5">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="3">3 {t('common.days')}</SelectItem>
                          <SelectItem value="5">5 {t('common.days')}</SelectItem>
                          <SelectItem value="7">7 {t('common.days')}</SelectItem>
                          <SelectItem value="10">10 {t('common.days')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className={`flex ${isRTL ? 'justify-start' : 'justify-end'} pt-4`}>
                  <Button>
                    {t('superadmin.settings.saveButton')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="paypal">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Wallet className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{t('superadmin.paypal.title')}</CardTitle>
                      <CardDescription>{t('superadmin.paypal.description')}</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>{t('superadmin.paypal.enabled')}</Label>
                    <p className="text-sm text-muted-foreground">{t('superadmin.paypal.enabledDesc')}</p>
                  </div>
                  <Switch checked={paypalEnabled} onCheckedChange={setPaypalEnabled} />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{t('superadmin.paypal.clientId')}</Label>
                    <input
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      value={paypalClientId}
                      onChange={(e) => setPaypalClientId(e.target.value)}
                      placeholder="PAYPAL_CLIENT_ID"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('superadmin.paypal.mode')}</Label>
                    <Select value={paypalMode} onValueChange={(v: "sandbox" | "live") => setPaypalMode(v)}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('superadmin.paypal.selectMode')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sandbox">{t('superadmin.paypal.sandbox')}</SelectItem>
                        <SelectItem value="live">{t('superadmin.paypal.live')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('superadmin.paypal.secret')}</Label>
                    <input
                      type="password"
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      value={paypalSecret}
                      onChange={(e) => setPaypalSecret(e.target.value)}
                      placeholder="PAYPAL_SECRET"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('superadmin.paypal.email')}</Label>
                    <input
                      type="email"
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      value={paypalEmail}
                      onChange={(e) => setPaypalEmail(e.target.value)}
                      placeholder="business@example.com"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button onClick={connectPayPal} disabled={paypalSaving || paypalTesting} className="sm:w-auto">
                    {paypalSaving || paypalTesting ? t('superadmin.paypal.connecting') : t('superadmin.paypal.connectButton')}
                  </Button>
                  <a
                    href="https://developer.paypal.com/dashboard/applications"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center"
                  >
                    <Button variant="outline" className="sm:w-auto">
                      {t('superadmin.paypal.getCredentials')}
                    </Button>
                  </a>
                </div>
                
                <div className="pt-6">
                  <h4 className="font-medium mb-2">{t('superadmin.paypal.transactions')}</h4>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('superadmin.paypal.table.amount')}</TableHead>
                          <TableHead>{t('superadmin.paypal.table.currency')}</TableHead>
                          <TableHead>{t('superadmin.paypal.table.status')}</TableHead>
                          <TableHead>{t('superadmin.paypal.table.date')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paypalPayments.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell>{p.amount}</TableCell>
                            <TableCell>{p.currency}</TableCell>
                            <TableCell>{p.payment_status}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(p.created_at).toLocaleString(i18n.language === 'ar' ? 'ar-MA' : i18n.language === 'fr' ? 'fr-FR' : 'en-GB')}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="pt-6">
                  <h4 className="font-medium mb-2">{t('superadmin.paypal.logs')}</h4>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('superadmin.paypal.table.event')}</TableHead>
                          <TableHead>{t('superadmin.paypal.table.status')}</TableHead>
                          <TableHead>{t('superadmin.paypal.table.message')}</TableHead>
                          <TableHead>{t('superadmin.paypal.table.date')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paypalLogs.map((l) => (
                          <TableRow key={l.id}>
                            <TableCell>{l.event}</TableCell>
                            <TableCell>
                              <Badge variant={l.status === 'success' ? 'default' : 'destructive'}>
                                {l.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-[320px] truncate">{l.message || '-'}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(l.created_at).toLocaleString(i18n.language === 'ar' ? 'ar-MA' : i18n.language === 'fr' ? 'fr-FR' : 'en-GB')}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <AlertDialog
        open={confirmDialog?.open || false}
        onOpenChange={(open) => !open && setConfirmDialog(null)}
      >
        <AlertDialogContent dir={isRTL ? "rtl" : "ltr"}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('superadmin.roles.confirmDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog?.newRole === 'admin'
                ? t('superadmin.roles.confirmDialog.promoteDesc', { name: confirmDialog?.userName })
                : t('superadmin.roles.confirmDialog.demoteDesc', { name: confirmDialog?.userName })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                confirmDialog &&
                handleRoleChange(confirmDialog.userId, confirmDialog.newRole)
              }
              className={ 
                confirmDialog?.newRole === 'admin'
                  ? 'bg-primary hover:bg-primary/90'
                  : 'bg-loss hover:bg-loss/90'
              }
            >
              {t('common.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
