import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Shield, UserCheck, UserX, RefreshCw, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { useToast } from '@/hooks/use-toast';
import Navbar from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

interface UserData {
  user_id: string;
  email: string;
  full_name: string | null;
  challenge_id: string | null;
  plan: string | null;
  status: string | null;
  current_balance: number | null;
  real_currency: string | null;
  initial_balance: number | null;
  created_at: string | null;
}

export default function Admin() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { toast } = useToast();

  const MAD_RATE = 10;

  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    challengeId: string;
    newStatus: 'passed' | 'failed';
    userName: string;
  } | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!adminLoading && !isAdmin && user) {
      // Not an admin, show access denied
    }
  }, [adminLoading, isAdmin, user]);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_admin_users_data');
      
      if (error) {
        console.error('Error fetching users:', error);
        toast({
          title: t('common.error'),
          description: error.message,
          variant: 'destructive',
        });
      } else {
        // Auto-correct legacy balance units for all users in the table
        if (data) {
          for (const user of data) {
            if (user.initial_balance && user.initial_balance >= 50000) {
              console.log("Correcting legacy balance for user:", user.email);
              await supabase
                .from("challenges")
                .update({
                  initial_balance: user.initial_balance / 10,
                  current_balance: (user.current_balance || 0) / 10,
                  total_pnl: ((user as any).total_pnl || 0) / 10,
                })
                .eq("id", user.challenge_id);
            }
          }
        }
        setUsers(data || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (challengeId: string, newStatus: 'passed' | 'failed') => {
    setUpdating(challengeId);
    try {
      const { data, error } = await supabase.rpc('admin_update_challenge_status', {
        _challenge_id: challengeId,
        _new_status: newStatus,
      });

      if (error) {
        toast({
          title: t('common.error'),
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: t('common.success'),
          description: `Challenge marked as ${newStatus}`,
        });
        fetchUsers();
      }
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setUpdating(null);
      setConfirmDialog(null);
    }
  };

  const getStatusBadge = (status: string | null) => {
    if (!status) return null;
    
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      active: 'default',
      passed: 'secondary',
      failed: 'destructive',
      funded: 'outline',
    };

    return (
      <Badge variant={variants[status] || 'default'}>
        {t(`dashboard.${status}`)}
      </Badge>
    );
  };

  const formatMoney = (value: number | null, currency: string | null = 'MAD') => {
    if (value === null || !Number.isFinite(Number(value))) return '-';
    return new Intl.NumberFormat('fr-MA', {
      style: 'currency',
      currency: currency || 'MAD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center h-[80vh] text-center p-4">
          <Shield className="h-16 w-16 text-destructive mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {t('admin.accessDenied')}
          </h1>
          <p className="text-muted-foreground">{t('admin.adminOnly')}</p>
          <Button onClick={() => navigate('/')} className="mt-4">
            {t('nav.home')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">{t('admin.title')}</h1>
          </div>
          <Button onClick={fetchUsers} variant="outline" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {t('common.refresh')}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {t('admin.allUsers')}
            </CardTitle>
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
                      <TableHead>{t('admin.email')}</TableHead>
                      <TableHead>{t('admin.name')}</TableHead>
                      <TableHead>{t('admin.challenge')}</TableHead>
                      <TableHead>{t('admin.status')}</TableHead>
                        <TableHead>{t('admin.balance')}</TableHead>
                      <TableHead className="text-right">{t('admin.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((userData, index) => (
                      <TableRow key={`${userData.user_id}-${userData.challenge_id || index}`}>
                        <TableCell className="font-mono text-sm">
                          {userData.email}
                        </TableCell>
                        <TableCell>{userData.full_name || '-'}</TableCell>
                        <TableCell>
                          {userData.plan ? (
                            <Badge variant="outline">{userData.plan}</Badge>
                          ) : (
                            <span className="text-muted-foreground">{t('admin.noChallenge')}</span>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(userData.status)}</TableCell>
                        <TableCell>{formatMoney(userData.current_balance ? userData.current_balance * MAD_RATE : 0, userData.real_currency)}</TableCell>
                        <TableCell className="text-right">
                          {userData.challenge_id && userData.status === 'active' && (
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-profit border-profit hover:bg-profit/10"
                                disabled={updating === userData.challenge_id}
                                onClick={() =>
                                  setConfirmDialog({
                                    open: true,
                                    challengeId: userData.challenge_id!,
                                    newStatus: 'passed',
                                    userName: userData.full_name || userData.email,
                                  })
                                }
                              >
                                <UserCheck className="h-4 w-4 mr-1" />
                                {t('admin.markPassed')}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-loss border-loss hover:bg-loss/10"
                                disabled={updating === userData.challenge_id}
                                onClick={() =>
                                  setConfirmDialog({
                                    open: true,
                                    challengeId: userData.challenge_id!,
                                    newStatus: 'failed',
                                    userName: userData.full_name || userData.email,
                                  })
                                }
                              >
                                <UserX className="h-4 w-4 mr-1" />
                                {t('admin.markFailed')}
                              </Button>
                            </div>
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
      </main>

      <AlertDialog
        open={confirmDialog?.open || false}
        onOpenChange={(open) => !open && setConfirmDialog(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.confirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog?.newStatus === 'passed'
                ? `Mark ${confirmDialog?.userName}'s challenge as passed?`
                : `Mark ${confirmDialog?.userName}'s challenge as failed?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                confirmDialog &&
                handleUpdateStatus(confirmDialog.challengeId, confirmDialog.newStatus)
              }
              className={
                confirmDialog?.newStatus === 'passed'
                  ? 'bg-profit hover:bg-profit/90'
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
