import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../../lib/prisma';
import { authenticate, requireOrganization, requireAdmin } from '../middleware/auth';

const router = Router();

// Validation schemas
const updateOrgSchema = z.object({
  name: z.string().min(1).max(100).optional(),
});

const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['ADMIN', 'VIEWER']).default('VIEWER'),
});

/**
 * GET /api/organizations
 * Get all organizations the user belongs to
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const memberships = await prisma.membership.findMany({
      where: { userId: req.user!.id },
      include: {
        organization: {
          include: {
            _count: {
              select: {
                memberships: true,
                adAccounts: true,
              },
            },
          },
        },
      },
    });

    const organizations = memberships.map((m) => ({
      id: m.organization.id,
      name: m.organization.name,
      slug: m.organization.slug,
      role: m.role,
      memberCount: m.organization._count.memberships,
      accountCount: m.organization._count.adAccounts,
      createdAt: m.organization.createdAt,
    }));

    res.json({ organizations });
  } catch (error) {
    console.error('Get organizations error:', error);
    res.status(500).json({ error: 'Failed to get organizations' });
  }
});

/**
 * GET /api/organizations/:id
 * Get organization details
 */
router.get('/:id', authenticate, requireOrganization, async (req: Request, res: Response) => {
  try {
    const organization = await prisma.organization.findUnique({
      where: { id: req.params.id },
      include: {
        memberships: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
              },
            },
          },
        },
        connections: {
          select: {
            id: true,
            provider: true,
            status: true,
            providerEmail: true,
            createdAt: true,
          },
        },
        _count: {
          select: { adAccounts: true },
        },
      },
    });

    if (!organization) {
      res.status(404).json({ error: 'Organization not found' });
      return;
    }

    res.json({
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        createdAt: organization.createdAt,
        accountCount: organization._count.adAccounts,
      },
      members: organization.memberships.map((m) => ({
        id: m.id,
        role: m.role,
        joinedAt: m.createdAt,
        user: m.user,
      })),
      connections: organization.connections,
    });
  } catch (error) {
    console.error('Get organization error:', error);
    res.status(500).json({ error: 'Failed to get organization' });
  }
});

/**
 * PATCH /api/organizations/:id
 * Update organization details
 */
router.patch('/:id', authenticate, requireOrganization, requireAdmin, async (req: Request, res: Response) => {
  try {
    const data = updateOrgSchema.parse(req.body);

    const organization = await prisma.organization.update({
      where: { id: req.params.id },
      data,
    });

    res.json({ organization });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
      return;
    }
    console.error('Update organization error:', error);
    res.status(500).json({ error: 'Failed to update organization' });
  }
});

/**
 * GET /api/organizations/:id/members
 * Get organization members
 */
router.get('/:id/members', authenticate, requireOrganization, async (req: Request, res: Response) => {
  try {
    const memberships = await prisma.membership.findMany({
      where: { organizationId: req.params.id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const members = memberships.map((m) => ({
      id: m.id,
      role: m.role,
      joinedAt: m.createdAt,
      user: m.user,
    }));

    res.json({ members });
  } catch (error) {
    console.error('Get members error:', error);
    res.status(500).json({ error: 'Failed to get members' });
  }
});

/**
 * POST /api/organizations/:id/members
 * Invite a new member to organization
 */
router.post('/:id/members', authenticate, requireOrganization, requireAdmin, async (req: Request, res: Response) => {
  try {
    const data = inviteMemberSchema.parse(req.body);

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      // In a real app, you'd send an invitation email here
      res.status(404).json({ 
        error: 'User not found',
        message: 'User must sign up before being added to the organization',
      });
      return;
    }

    // Check if user is already a member
    const existingMembership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: req.params.id,
        },
      },
    });

    if (existingMembership) {
      res.status(400).json({ error: 'User is already a member' });
      return;
    }

    // Create membership
    const membership = await prisma.membership.create({
      data: {
        userId: user.id,
        organizationId: req.params.id,
        role: data.role,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    res.status(201).json({
      member: {
        id: membership.id,
        role: membership.role,
        joinedAt: membership.createdAt,
        user: membership.user,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
      return;
    }
    console.error('Add member error:', error);
    res.status(500).json({ error: 'Failed to add member' });
  }
});

/**
 * PATCH /api/organizations/:id/members/:memberId
 * Update member role
 */
router.patch('/:id/members/:memberId', authenticate, requireOrganization, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { role } = z.object({ role: z.enum(['ADMIN', 'VIEWER']) }).parse(req.body);

    const membership = await prisma.membership.update({
      where: {
        id: req.params.memberId,
        organizationId: req.params.id,
      },
      data: { role },
    });

    res.json({ membership });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
      return;
    }
    console.error('Update member error:', error);
    res.status(500).json({ error: 'Failed to update member' });
  }
});

/**
 * DELETE /api/organizations/:id/members/:memberId
 * Remove a member from organization
 */
router.delete('/:id/members/:memberId', authenticate, requireOrganization, requireAdmin, async (req: Request, res: Response) => {
  try {
    // Don't allow removing the last admin
    const adminCount = await prisma.membership.count({
      where: {
        organizationId: req.params.id,
        role: 'ADMIN',
      },
    });

    const memberToRemove = await prisma.membership.findUnique({
      where: { id: req.params.memberId },
    });

    if (!memberToRemove) {
      res.status(404).json({ error: 'Member not found' });
      return;
    }

    if (memberToRemove.role === 'ADMIN' && adminCount <= 1) {
      res.status(400).json({ error: 'Cannot remove the last admin' });
      return;
    }

    await prisma.membership.delete({
      where: { id: req.params.memberId },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

export default router;

