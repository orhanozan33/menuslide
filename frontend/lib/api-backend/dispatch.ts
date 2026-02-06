import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth-server';
import * as authHandlers from './handlers/auth';
import * as contentLibraryHandlers from './handlers/content-library';
import * as crudHandlers from './handlers/crud';
import * as crudMutations from './handlers/crud-mutations';
import * as menuItemsHandlers from './handlers/menu-items';
import * as menusHandlers from './handlers/menus';
import * as qrMenusHandlers from './handlers/qr-menus';
import * as publicScreenHandlers from './handlers/public-screen';
import * as screensHandlers from './handlers/screens';
import * as reportsHandlers from './handlers/reports';
import * as subscriptionsHandlers from './handlers/subscriptions';
import * as templateBlockContentsHandlers from './handlers/template-block-contents';
import * as templateBlocksHandlers from './handlers/template-blocks';
import * as screenBlocksHandlers from './handlers/screen-blocks';
import * as templatesHandlers from './handlers/templates';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL?.trim() || '';

/** Returns true if we should handle the request locally (no external backend). */
export function useLocalBackend(): boolean {
  return !BACKEND_URL;
}

/** Forward request to external backend (Render). */
export async function forwardToBackend(
  request: NextRequest,
  pathSegments: string[],
  method: string
): Promise<Response> {
  const path = pathSegments.join('/');
  const url = new URL(request.url);
  const query = url.searchParams.toString();
  const targetUrl = `${BACKEND_URL}/${path}${query ? `?${query}` : ''}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const auth = request.headers.get('authorization');
  if (auth) headers['Authorization'] = auth;
  const options: RequestInit = { method, headers };
  if (method !== 'GET' && method !== 'HEAD') {
    try {
      const body = await request.text();
      if (body) options.body = body;
    } catch {
      // no body
    }
  }
  const res = await fetch(targetUrl, options);
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { message: text || 'Request failed' };
  }
  return Response.json(data, { status: res.status });
}

/** Handle request locally (Supabase + JWT). */
export async function handleLocal(
  request: NextRequest,
  pathSegments: string[],
  method: string
): Promise<Response> {
  const [resource, sub, id, sub2, sub3] = pathSegments;

  if (resource === 'subscriptions' && sub === 'webhook' && method === 'POST') {
    const rawBody = await request.text();
    const signature = request.headers.get('stripe-signature');
    return subscriptionsHandlers.handleWebhook(rawBody, signature);
  }

  if (resource === 'public' && sub === 'screen' && id) {
    if (method === 'GET') return publicScreenHandlers.getScreenByToken(id, request);
    if (method === 'POST' && sub2 === 'heartbeat') return publicScreenHandlers.recordViewerHeartbeat(id, request);
  }

  const authHeader = request.headers.get('authorization');
  const user = await verifyToken(authHeader);

  if (resource === 'subscriptions' && user) {
    if (sub === 'business' && id && method === 'GET') return subscriptionsHandlers.getByBusiness(id, user);
    if (sub === 'checkout' && method === 'POST') return subscriptionsHandlers.createCheckout(request, user);
    if (sub && id === 'payments' && method === 'GET') return subscriptionsHandlers.getPayments(sub, user);
    if (sub && id === 'cancel' && method === 'POST') return subscriptionsHandlers.cancelSubscription(sub, user);
  }

  if (resource === 'auth') {
    if (sub === 'login' && method === 'POST') return authHandlers.postLogin(request);
    if (sub === 'register' && method === 'POST') return authHandlers.postRegister(request);
    if (sub === 'me' && method === 'GET' && user) return authHandlers.getAuthMe(request, user);
    if (sub === 'me' && method === 'PATCH' && user) return authHandlers.patchAuthMe(request, user);
    if (sub === 'impersonate' && method === 'POST' && user) return authHandlers.postImpersonate(request, user);
    if (sub === 'account' && method === 'GET' && user) return authHandlers.getAccount(request, user);
    if (sub === 'admin-dashboard' && method === 'GET' && user) return authHandlers.getAdminDashboard(request, user);
    if (sub === 'change-password' && method === 'POST' && user) return authHandlers.changePassword(request, user);
    if (sub === 'payments' && method === 'GET' && user) return authHandlers.getMyPayments(request, user);
    if (sub === 'invoices' && id && method === 'GET' && user) return authHandlers.getInvoice(request, user, id);
    if ((sub === 'me' || sub === 'account' || sub === 'admin-dashboard' || sub === 'change-password' || sub === 'payments' || sub === 'invoices') && !user) {
      return Response.json({ message: 'Unauthorized' }, { status: 401 });
    }
  }

  if (!user && resource !== 'auth') {
    return Response.json({ message: 'Unauthorized' }, { status: 401 });
  }

  if (method === 'GET' && user && resource === 'menus' && sub === 'stats' && id === 'summary') {
    return menusHandlers.getStats(user);
  }
  if (method === 'GET' && user && resource === 'templates' && id && sub === 'blocks') {
    return templatesHandlers.getTemplateBlocks(id);
  }

  if (method === 'GET' && user && resource === 'reports') {
    if (sub === 'users') return reportsHandlers.getUsersWithSubscription(user);
    if (sub === 'stats') return reportsHandlers.getStats(request, user);
    if (sub === 'payment-status') return reportsHandlers.getPaymentStatus(user);
    if (sub === 'activity-users') return reportsHandlers.getActivityAdminUsers(user);
    if (sub === 'activity') return reportsHandlers.getActivityLog(request, user);
    if (sub === 'user' && id) return reportsHandlers.getUserDetailReport(id, user.userId, user);
  }
  if (method === 'POST' && user && resource === 'reports') {
    if (sub === 'activity') return reportsHandlers.logActivity(request, user);
    if (sub === 'subscription' && id && sub2 === 'mark-paid') return reportsHandlers.markSubscriptionPaid(id, request, user);
  }

  if (resource === 'content-library' && user) {
    if (method === 'GET' && sub === 'categories') return contentLibraryHandlers.getCategories();
    if (method === 'GET' && sub === 'my-uploads') return contentLibraryHandlers.getMyUploads(user);
    if (method === 'GET' && sub === 'user-uploads') return contentLibraryHandlers.getUserUploads(user);
    if (method === 'GET' && !sub && !id) return contentLibraryHandlers.findAll(request, user);
    if (method === 'GET' && id) {
      const url = new URL(request.url);
      return crudHandlers.handleGet(pathSegments, user, url.searchParams);
    }
    if (method === 'POST' && !id) return contentLibraryHandlers.create(request, user);
    if (method === 'PATCH' && id) return contentLibraryHandlers.update(id, request, user);
    if (method === 'DELETE' && id) return contentLibraryHandlers.remove(id, user);
  }

  if (resource === 'qr-menus' && user && method === 'GET' && sub === 'business' && id) {
    return qrMenusHandlers.getOrCreate(id, request, user);
  }

  if (resource === 'menu-items' && user) {
    if (method === 'GET' && !id) return menuItemsHandlers.findAll(request, user);
    if (method === 'GET' && id) return menuItemsHandlers.findOne(id, user);
    if (method === 'POST' && !id) return menuItemsHandlers.create(request, user);
    if (method === 'PATCH' && id) return menuItemsHandlers.update(id, request, user);
    if (method === 'DELETE' && id) return menuItemsHandlers.remove(id, user);
  }

  if (method === 'GET' && user && ['users', 'businesses', 'plans', 'menus', 'screens', 'templates', 'subscriptions', 'content-library'].includes(resource)) {
    const url = new URL(request.url);
    return crudHandlers.handleGet(pathSegments, user, url.searchParams);
  }

  if (resource === 'templates' && user) {
    if (method === 'GET' && sub === 'scope' && id) return templatesHandlers.findByScope(id, request, user);
    if (method === 'POST' && sub === 'apply') return templatesHandlers.applyToScreen(request, user);
    if (method === 'POST' && sub === 'bulk-system') return templatesHandlers.createBulkSystem(request, user);
    if (method === 'POST' && id && sub === 'duplicate') return templatesHandlers.duplicate(id, request, user);
    if (method === 'POST' && id && sub === 'save-as') return templatesHandlers.saveAs(id, request, user);
    if (method === 'POST' && id && sub === 'create-menu-from-products') return templatesHandlers.createMenuFromProducts(id, request, user);
    if (method === 'POST' && !id) return templatesHandlers.create(request, user);
    if (method === 'PATCH' && id) return templatesHandlers.update(id, request, user);
    if (method === 'DELETE' && id) return templatesHandlers.remove(id, user);
  }
  if (resource === 'screen-blocks' && user) {
    if (method === 'GET' && sub === 'screen' && id) return screenBlocksHandlers.findByScreen(id, user);
    if (method === 'POST' && sub === 'batch-update') return screenBlocksHandlers.batchUpdate(request, user);
    if (method === 'POST' && sub === 'screen' && id && sub2 === 'layer-order') return screenBlocksHandlers.updateLayerOrder(id, request, user);
    if (method === 'GET' && id) return screenBlocksHandlers.findOne(id, user);
    if (method === 'PATCH' && id) return screenBlocksHandlers.update(id, request, user);
  }
  if (resource === 'businesses' && user) {
    if (method === 'POST' && !id) return crudMutations.createBusiness(request, user);
    if (method === 'PATCH' && id) return crudMutations.updateBusiness(id, request, user);
  }
  if (resource === 'users' && user) {
    if (method === 'POST' && !id) return crudMutations.createUser(request, user);
    if (method === 'PATCH' && id) return crudMutations.updateUser(id, request, user);
  }
  if (resource === 'plans' && user) {
    if (method === 'POST' && !id) return crudMutations.createPlan(request, user);
    if (method === 'PATCH' && id) return crudMutations.updatePlan(id, request, user);
  }
  if (resource === 'ai' && user && method === 'POST' && sub === 'remove-background') {
    return Response.json({ message: 'Remove background is not available on Vercel. Use backend or external service.', url: null }, { status: 501 });
  }
  if (resource === 'ai-templates' && user && method === 'POST' && sub === 'generate') {
    return Response.json({ message: 'AI template generation is not available on Vercel. Use backend.', template: null }, { status: 501 });
  }
  if (resource === 'menus' && user) {
    if (method === 'POST' && !id) return menusHandlers.create(request, user);
    if (method === 'PATCH' && id) return menusHandlers.update(id, request, user);
    if (method === 'DELETE' && id) return menusHandlers.remove(id, user);
  }
  if (resource === 'screens' && user) {
    if (method === 'GET' && sub === 'alerts' && id === 'multi-device') return screensHandlers.getMultiDeviceAlerts(user);
    if (method === 'POST' && !id) return screensHandlers.create(request, user);
    if (method === 'PATCH' && id) return screensHandlers.update(id, request, user);
    if (method === 'DELETE' && id) return screensHandlers.remove(id, user);
    if (method === 'GET' && id && sub === 'menus') return screensHandlers.getScreenMenus(id, user);
    if (method === 'POST' && id && sub === 'assign-menu') return screensHandlers.assignMenu(id, request, user);
    if (method === 'DELETE' && id && sub === 'menus' && sub2) return screensHandlers.removeMenu(id, sub2, user);
    if (method === 'GET' && id && sub === 'template-rotations') return screensHandlers.getTemplateRotations(id, user);
    if (method === 'POST' && id && sub === 'publish-templates') return screensHandlers.publishTemplates(id, request, user);
    if (method === 'POST' && id && sub === 'stop-publishing') return screensHandlers.stopPublishing(id, user);
  }

  if (resource === 'template-blocks' && user) {
    if (method === 'GET' && sub === 'template' && id) return templateBlocksHandlers.findByTemplate(id);
    if (method === 'POST' && sub === 'batch-update') return templateBlocksHandlers.batchUpdate(request);
    if (method === 'GET' && id) return templateBlocksHandlers.findOne(id);
    if (method === 'POST' && !id) return templateBlocksHandlers.create(request);
    if (method === 'PATCH' && id) return templateBlocksHandlers.update(id, request);
    if (method === 'DELETE' && id) return templateBlocksHandlers.remove(id);
  }
  if (resource === 'template-block-contents' && user) {
    if (method === 'GET' && sub === 'block' && id) return templateBlockContentsHandlers.findByBlock(id);
    if (method === 'GET' && id) return templateBlockContentsHandlers.findOne(id);
    if (method === 'POST' && !id) return templateBlockContentsHandlers.create(request);
    if (method === 'PATCH' && id) return templateBlockContentsHandlers.update(id, request);
    if (method === 'DELETE' && id) return templateBlockContentsHandlers.remove(id);
  }

  return Response.json(
    { message: 'Endpoint not yet migrated to Vercel API. Set NEXT_PUBLIC_API_URL to use Render backend.' },
    { status: 501 }
  );
}
