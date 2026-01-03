'use client';

import { useState } from 'react';
import {
  UserPlus,
  MoreVertical,
  Shield,
  Eye,
  Mail,
  Trash2,
  Crown,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Avatar, AvatarFallback } from '@/src/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select';
import { cn } from '@/src/lib/utils';

// Mock team data
const mockMembers = [
  {
    id: '1',
    email: 'demo@example.com',
    firstName: 'Demo',
    lastName: 'User',
    role: 'ADMIN',
    joinedAt: '2024-01-15T10:00:00Z',
    lastActive: '2024-12-17T14:30:00Z',
    isCurrentUser: true,
  },
  {
    id: '2',
    email: 'sarah@example.com',
    firstName: 'Sarah',
    lastName: 'Johnson',
    role: 'ADMIN',
    joinedAt: '2024-02-20T09:00:00Z',
    lastActive: '2024-12-17T11:45:00Z',
    isCurrentUser: false,
  },
  {
    id: '3',
    email: 'mike@example.com',
    firstName: 'Mike',
    lastName: 'Chen',
    role: 'VIEWER',
    joinedAt: '2024-06-10T14:00:00Z',
    lastActive: '2024-12-16T16:20:00Z',
    isCurrentUser: false,
  },
  {
    id: '4',
    email: 'alex@example.com',
    firstName: 'Alex',
    lastName: 'Rivera',
    role: 'VIEWER',
    joinedAt: '2024-09-05T11:00:00Z',
    lastActive: '2024-12-15T09:10:00Z',
    isCurrentUser: false,
  },
];

const pendingInvites = [
  { email: 'jane@example.com', role: 'VIEWER', sentAt: '2024-12-15T10:00:00Z' },
];

function RoleBadge({ role }: { role: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
        role === 'ADMIN'
          ? 'bg-violet-500/10 text-violet-400'
          : 'bg-muted text-muted-foreground'
      )}
    >
      {role === 'ADMIN' ? <Shield className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
      {role}
    </span>
  );
}

function getInitials(firstName: string, lastName: string) {
  return `${firstName[0]}${lastName[0]}`.toUpperCase();
}

function formatRelativeTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function TeamPage() {
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('VIEWER');
  const [isInviting, setIsInviting] = useState(false);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsInviting(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsInviting(false);
    setShowInviteForm(false);
    setInviteEmail('');
    setInviteRole('VIEWER');
  };

  const adminCount = mockMembers.filter((m) => m.role === 'ADMIN').length;
  const viewerCount = mockMembers.filter((m) => m.role === 'VIEWER').length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Team</h1>
          <p className="text-muted-foreground">Manage your organization members</p>
        </div>
        <Button onClick={() => setShowInviteForm(true)}>
          <UserPlus className="w-4 h-4 mr-2" />
          Invite Member
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{adminCount}</p>
                <p className="text-sm text-muted-foreground">Admins</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <Eye className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{viewerCount}</p>
                <p className="text-sm text-muted-foreground">Viewers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <Mail className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingInvites.length}</p>
                <p className="text-sm text-muted-foreground">Pending Invites</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invite Form */}
      {showInviteForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Invite Team Member</CardTitle>
            <CardDescription>Send an invitation to join your organization</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="colleague@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={inviteRole} onValueChange={setInviteRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="VIEWER">
                        <div className="flex items-center gap-2">
                          <Eye className="w-4 h-4" />
                          Viewer - Can view dashboards
                        </div>
                      </SelectItem>
                      <SelectItem value="ADMIN">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4" />
                          Admin - Full access
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={isInviting}>
                  {isInviting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send Invitation'
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowInviteForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Pending Invites */}
      {pendingInvites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pending Invitations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingInvites.map((invite) => (
                <div
                  key={invite.email}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-yellow-500/10 text-yellow-500">
                        <Mail className="w-4 h-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{invite.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Invited {formatRelativeTime(invite.sentAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <RoleBadge role={invite.role} />
                    <Button variant="outline" size="sm">
                      Resend
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                      Cancel
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Members List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Team Members</CardTitle>
          <CardDescription>{mockMembers.length} members in your organization</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockMembers.map((member) => (
              <div
                key={member.id}
                className={cn(
                  'flex items-center justify-between p-4 rounded-lg border transition-colors',
                  member.isCurrentUser ? 'border-primary/50 bg-primary/5' : 'border-border hover:bg-muted/50'
                )}
              >
                <div className="flex items-center gap-4">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="bg-primary/10 text-primary font-medium">
                      {getInitials(member.firstName, member.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        {member.firstName} {member.lastName}
                      </p>
                      {member.isCurrentUser && (
                        <span className="text-xs text-primary">(You)</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{member.email}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Last active: {formatRelativeTime(member.lastActive)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <RoleBadge role={member.role} />
                  {!member.isCurrentUser && (
                    <div className="flex items-center gap-1">
                      <Select defaultValue={member.role}>
                        <SelectTrigger className="w-[120px] h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ADMIN">Admin</SelectItem>
                          <SelectItem value="VIEWER">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive h-8 w-8">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Role Descriptions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Role Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-4 rounded-lg border border-violet-500/20 bg-violet-500/5">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-5 h-5 text-violet-400" />
                <h3 className="font-semibold">Admin</h3>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  View all dashboards and metrics
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  Connect and manage ad accounts
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  Trigger manual data syncs
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  Invite and manage team members
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  Modify organization settings
                </li>
              </ul>
            </div>
            <div className="p-4 rounded-lg border border-border bg-muted/30">
              <div className="flex items-center gap-2 mb-3">
                <Eye className="w-5 h-5 text-muted-foreground" />
                <h3 className="font-semibold">Viewer</h3>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  View all dashboards and metrics
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  View connected ad accounts
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  View sync status and history
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  Cannot modify account connections
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  Cannot manage team members
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

