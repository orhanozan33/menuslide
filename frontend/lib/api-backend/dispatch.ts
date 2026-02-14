import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth-server';
import * as authHandlers from './handlers/auth';
import * as contentLibraryHandlers from './handlers/content-library';
import * as crudHandlers from './handlers/crud';
import * as crudMutations from './handlers/crud-mutations';
import * as menuItemsHandlers from './handlers/menu-items';
import * as menusHandlers from './handlers/menus';
import * as qrMenusHandlers from './handlers/qr-menus';
import * as menuResolverHandlers from './handlers/menu-resolver';
import * as publicScreenHandlers from './handlers/public-screen';
import * as screensHandlers from './handlers/screens';
import * as reportsHandlers from './handlers/reports';
import * as subscriptionsHandlers from './handlers/subscriptions';
import * as templateBlockContentsHandlers from './handlers/template-block-contents';
import * as templateBlocksHandlers from './handlers/template-blocks';
import * as screenBlocksHandlers from './handlers/screen-blocks';
import * as templatesHandlers from './handlers/templates';
import * as registrationRequestsHandlers from './handlers/registration-requests';

/** Handle request locally (Supabase + JWT). Harici backend kullanılmıyor. */
export async function handleLocal(
  request: NextRequest,
  pathSegments: string[],
  method: string
): Promise<Response> {
  const [resource, sub, id, sub2, sub3] = pathSegments;

  if (!resource || pathSegments.length === 0) {
    return Response.json({ message: 'API path gerekli (örn. /api/proxy/auth/login)' }, { status: 400 });
  }

  // Player: herkese açık, token gerekmez (TV uygulaması / tarayıcı kontrolü)
  const isPlayerCheck = (resource === 'player' && sub === 'check') || pathSegments.join('/') === 'player/check';
  if (isPlayerCheck && method === 'GET') return publicScreenHandlers.checkPlayerConfig();
  if (resource === 'player' && sub === 'resolve' && method === 'POST') return publicScreenHandlers.resolvePlayer(request);

  // Auth login/register — token gerekmez, en başta ele al (giriş her zaman çalışsın)
  // Path bazen tek segment olarak gelir: "auth/login" -> resource="auth/login", sub undefined
  if (resource === 'auth' && sub === 'login' && method === 'POST') return authHandlers.postLogin(request);
  if (resource === 'auth' && sub === 'register' && method === 'POST') return authHandlers.postRegister(request);
  if (resource === 'auth/login' && method === 'POST') return authHandlers.postLogin(request);
  if (resource === 'auth/register' && method === 'POST') return authHandlers.postRegister(request);

  if (resource === 'subscriptions' && sub === 'webhook' && method === 'POST') {
    const rawBody = await request.text();
    const signature = request.headers.get('stripe-signature');
    return subscriptionsHandlers.handleWebhook(rawBody, signature);
  }

  if (resource === 'public' && sub === 'screen' && id) {
    if (method === 'GET') return publicScreenHandlers.getScreenByToken(id, request);
    if (method === 'POST' && sub2 === 'heartbeat') return publicScreenHandlers.recordViewerHeartbeat(id, request);
  }

  // Kayıt talepleri: POST herkese açık, GET/PATCH/DELETE admin
  if (resource === 'registration-requests') {
    if (method === 'POST' && !id) return registrationRequestsHandlers.create(request);
  }

  // Fiyatlandırma sayfası: Planlar token olmadan erişilebilir
  if (method === 'GET' && resource === 'plans' && !id) return crudHandlers.getPlansPublic();

  // Stripe durumu (pricing sayfası için, public)
  if (method === 'GET' && resource === 'settings' && sub === 'stripe-available') {
    const hasStripe = !!(
      process.env.STRIPE_SECRET_KEY ||
      process.env.STRIPE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    );
    return Response.json({ available: !!hasStripe });
  }

  // Menu resolver - QR sayfası için (public, token gerekmez)
  if (resource === 'menu-resolver') {
    if (method === 'GET' && sub === 'business' && id) return menuResolverHandlers.getBusinessMenus(id, request);
    if (method === 'GET' && sub === 'item' && id) {
      const url = new URL(request.url);
      const lang = url.searchParams.get('lang') || 'en';
      return menuResolverHandlers.getMenuItemDetails(id, lang);
    }
    if (method === 'GET' && sub === 'languages' && id) return menuResolverHandlers.getMenuLanguages(id);
  }

  // QR menü - slug çözümleme ve görüntüleme kaydı (public)
  if (resource === 'qr-menus') {
    if (method === 'GET' && sub === 'slug' && id) return qrMenusHandlers.resolveBySlug(id);
    if (method === 'POST' && sub === 'view' && id) return qrMenusHandlers.recordView(id, request);
  }

  const authHeader = request.headers.get('authorization');
  const user = await verifyToken(authHeader);

  // Stripe ayarlar sayfası (admin gerekli)
  if (method === 'GET' && resource === 'settings' && sub === 'stripe-status' && user) {
    if (user.role !== 'super_admin' && user.role !== 'admin') {
      return Response.json({ message: 'Admin access required' }, { status: 403 });
    }
    const secretKey = process.env.STRIPE_SECRET_KEY || '';
    const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY || '';
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
    const configured =
      !!secretKey &&
      secretKey.length > 0 &&
      secretKey !== 'sk_test_your_stripe_secret_key';
    const stripeMode = secretKey?.startsWith('sk_live_') ? 'live' : 'test';
    return Response.json({
      configured,
      stripeMode,
      hasPublishableKey: !!publishableKey && publishableKey.length > 0 && publishableKey !== 'pk_test_your_publishable_key',
      hasWebhookSecret: !!webhookSecret && webhookSecret.length > 0 && webhookSecret !== 'whsec_your_webhook_secret',
    });
  }

  if (resource === 'subscriptions' && user) {
    if (sub === 'business' && id && method === 'GET') return subscriptionsHandlers.getByBusiness(id, user);
    if (sub === 'checkout' && method === 'POST') return subscriptionsHandlers.createCheckout(request, user);
    if (sub && id === 'payments' && method === 'GET') return subscriptionsHandlers.getPayments(sub, user);
    if (sub && id === 'cancel' && method === 'POST') return subscriptionsHandlers.cancelSubscription(sub, user);
  }

  if (resource === 'auth') {
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
  if (resource === 'registration-requests' && user) {
    if (method === 'GET' && !sub) return registrationRequestsHandlers.findAll(user);
    if (method === 'PATCH' && sub && id === 'status') return registrationRequestsHandlers.updateStatus(sub, request, user);
    if (method === 'DELETE' && sub) return registrationRequestsHandlers.remove(sub, user);
  }

  if (method === 'GET' && user && resource === 'reports') {
    if (sub === 'users') return reportsHandlers.getUsersWithSubscription(user);
    if (sub === 'stats') return reportsHandlers.getStats(request, user);
    if (sub === 'payment-status') return reportsHandlers.getPaymentStatus(user);
    if (sub === 'activity-users') return reportsHandlers.getActivityAdminUsers(user);
    if (sub === 'activity') return reportsHandlers.getActivityLog(request, user);
    if (sub === 'user' && id) {
      if (sub2 === 'invoice' && sub3) return reportsHandlers.getInvoiceForUser(id, sub3, user);
      return reportsHandlers.getUserDetailReport(id, user.userId, user);
    }
  }
  if (method === 'POST' && user && resource === 'reports') {
    if (sub === 'activity') return reportsHandlers.logActivity(request, user);
    if (sub === 'subscription' && id && sub2 === 'mark-paid') return reportsHandlers.markSubscriptionPaid(id, request, user);
  }
  if (method === 'DELETE' && user && resource === 'reports' && sub === 'activity') return reportsHandlers.clearActivityLog(user);

  if (resource === 'content-library' && user) {
    const contentLibraryId = sub && /^[0-9a-f-]{36}$/i.test(sub) && !['categories', 'my-uploads', 'user-uploads'].includes(sub) ? sub : id;
    if (method === 'GET' && sub === 'categories') return contentLibraryHandlers.getCategories();
    if (method === 'GET' && sub === 'my-uploads') return contentLibraryHandlers.getMyUploads(user);
    if (method === 'GET' && sub === 'user-uploads') return contentLibraryHandlers.getUserUploads(user);
    if (method === 'GET' && !sub && !id) return contentLibraryHandlers.findAll(request, user);
    if (method === 'POST' && sub === 'remove-duplicates-by-name') return contentLibraryHandlers.removeDuplicatesByName(user);
    if (method === 'GET' && contentLibraryId) {
      const url = new URL(request.url);
      return crudHandlers.handleGet(pathSegments, user, url.searchParams);
    }
    if (method === 'POST' && !id) return contentLibraryHandlers.create(request, user);
    if (method === 'PATCH' && contentLibraryId) return contentLibraryHandlers.update(contentLibraryId, request, user);
    if (method === 'DELETE' && contentLibraryId) return contentLibraryHandlers.remove(contentLibraryId, user);
  }

  if (resource === 'qr-menus' && user && method === 'GET' && sub === 'business' && id) {
    return qrMenusHandlers.getOrCreate(id, request, user);
  }

  if (resource === 'menu-items' && user) {
    const itemId = id || (sub && /^[0-9a-f-]{36}$/i.test(sub) ? sub : undefined);
    if (method === 'GET' && !itemId) return menuItemsHandlers.findAll(request, user);
    if (method === 'GET' && itemId) return menuItemsHandlers.findOne(itemId, user);
    if (method === 'POST' && !id) return menuItemsHandlers.create(request, user);
    if (method === 'PATCH' && itemId) return menuItemsHandlers.update(itemId, request, user);
    if (method === 'DELETE' && itemId) return menuItemsHandlers.remove(itemId, user);
  }

  if (resource === 'templates' && user) {
    const templateId = sub && /^[0-9a-f-]{36}$/i.test(sub) ? sub : undefined;
    if (method === 'GET' && sub === 'scope' && id) return templatesHandlers.findByScope(id, request, user);
    if (method === 'GET' && templateId && !id) return templatesHandlers.findOne(templateId, user);
    if (method === 'GET' && templateId && id === 'blocks') return templatesHandlers.getTemplateBlocks(templateId);
    if (method === 'POST' && sub === 'apply') return templatesHandlers.applyToScreen(request, user);
    if (method === 'POST' && sub === 'bulk-system') return templatesHandlers.createBulkSystem(request, user);
    if (method === 'POST' && templateId && id === 'duplicate') return templatesHandlers.duplicate(templateId, request, user);
    if (method === 'POST' && templateId && id === 'copy-to-system') return templatesHandlers.copyToSystem(templateId, request, user);
    if (method === 'POST' && templateId && id === 'save-as') return templatesHandlers.saveAs(templateId, request, user);
    if (method === 'POST' && templateId && id === 'create-menu-from-products') return templatesHandlers.createMenuFromProducts(templateId, request, user);
    if (method === 'POST' && !sub) return templatesHandlers.create(request, user);
    if (method === 'PATCH' && templateId) return templatesHandlers.update(templateId, request, user);
    if (method === 'DELETE' && templateId) return templatesHandlers.remove(templateId, user);
  }
  if (resource === 'screen-blocks' && user) {
    if (method === 'GET' && sub === 'screen' && id) return screenBlocksHandlers.findByScreen(id, user);
    if (method === 'POST' && sub === 'batch-update') return screenBlocksHandlers.batchUpdate(request, user);
    if (method === 'POST' && sub === 'screen' && id && sub2 === 'layer-order') return screenBlocksHandlers.updateLayerOrder(id, request, user);
    if (method === 'GET' && id) return screenBlocksHandlers.findOne(id, user);
    if (method === 'PATCH' && id) return screenBlocksHandlers.update(id, request, user);
  }
  if (resource === 'businesses' && user) {
    const businessId = id || (sub && /^[0-9a-f-]{36}$/i.test(sub) ? sub : undefined);
    if (method === 'POST' && !id) return crudMutations.createBusiness(request, user);
    if (method === 'PATCH' && businessId) return crudMutations.updateBusiness(businessId, request, user);
  }
  if (resource === 'users' && user) {
    const userId = id || (sub && /^[0-9a-f-]{36}$/i.test(sub) ? sub : undefined);
    if (method === 'POST' && !id) return crudMutations.createUser(request, user);
    if (method === 'PATCH' && userId) return crudMutations.updateUser(userId, request, user);
    if (method === 'DELETE' && userId) return crudMutations.deleteUser(userId, user);
  }
  if (resource === 'plans' && user) {
    if (method === 'POST' && !id) return crudMutations.createPlan(request, user);
    if (method === 'PATCH' && id) return crudMutations.updatePlan(id, request, user);
  }
  if (resource === 'ai' && user && method === 'POST' && sub === 'remove-background') {
    return Response.json({ message: 'Remove background is not available on Vercel. Use backend or run locally.', url: null, dataUrl: null }, { status: 501 });
  }
  if (resource === 'ai-templates' && user && method === 'POST' && sub === 'generate') {
    return Response.json({ message: 'AI template generation is not available on Vercel. Use backend.', template: null }, { status: 501 });
  }
  if (resource === 'menus' && user) {
    const menuId = (id || sub) && /^[0-9a-f-]{36}$/i.test(String(id || sub)) ? (id || sub) : undefined;
    if (method === 'POST' && !id) return menusHandlers.create(request, user);
    if (method === 'PATCH' && menuId) return menusHandlers.update(menuId, request, user);
    if (method === 'DELETE' && menuId) return menusHandlers.remove(menuId, user);
  }
  if (resource === 'screens' && user) {
    // /screens -> sub undefined | /screens/fix-names -> sub=fix-names | /screens/uuid -> sub=uuid | /screens/uuid/menus -> sub=uuid, id=menus
    const screenId = sub && sub.length === 36 && /^[0-9a-f-]{36}$/i.test(sub) ? sub : undefined;
    if (method === 'GET' && sub === 'alerts' && id === 'multi-device') return screensHandlers.getMultiDeviceAlerts(user);
    if (method === 'POST' && sub === 'fix-names') return screensHandlers.fixNames(request, user);
    if (method === 'POST' && !sub) return screensHandlers.create(request, user);
    if (method === 'PATCH' && screenId) return screensHandlers.update(screenId, request, user);
    if (method === 'DELETE' && screenId && id !== 'menus') return screensHandlers.remove(screenId, user);
    if (method === 'GET' && screenId && id === 'menus') return screensHandlers.getScreenMenus(screenId, user);
    if (method === 'POST' && screenId && id === 'assign-menu') return screensHandlers.assignMenu(screenId, request, user);
    if (method === 'DELETE' && screenId && id === 'menus' && sub2) return screensHandlers.removeMenu(screenId, sub2, user);
    if (method === 'GET' && screenId && id === 'template-rotations') return screensHandlers.getTemplateRotations(screenId, user);
    if (method === 'POST' && screenId && id === 'publish-templates') return screensHandlers.publishTemplates(screenId, request, user);
    if (method === 'POST' && screenId && id === 'generate-slides') return screensHandlers.generateSlides(screenId, request, user);
    if (method === 'POST' && screenId && id === 'stop-publishing') return screensHandlers.stopPublishing(screenId, user);
  }

  if (resource === 'template-blocks' && user) {
    const blockId = (sub && /^[0-9a-f-]{36}$/i.test(sub)) ? sub : id;
    if (method === 'GET' && sub === 'template' && id) return templateBlocksHandlers.findByTemplate(id);
    if (method === 'POST' && sub === 'batch-update') return templateBlocksHandlers.batchUpdate(request);
    if (method === 'GET' && blockId) return templateBlocksHandlers.findOne(blockId);
    if (method === 'POST' && !sub) return templateBlocksHandlers.create(request);
    if (method === 'PATCH' && blockId) return templateBlocksHandlers.update(blockId, request);
    if (method === 'DELETE' && blockId) return templateBlocksHandlers.remove(blockId);
  }
  if (resource === 'template-block-contents' && user) {
    const contentId = sub === 'block' ? undefined : (id || sub);
    if (method === 'GET' && sub === 'block' && id) return templateBlockContentsHandlers.findByBlock(id);
    if (method === 'GET' && contentId) return templateBlockContentsHandlers.findOne(contentId);
    if (method === 'POST' && !id) return templateBlockContentsHandlers.create(request);
    if (method === 'PATCH' && contentId) return templateBlockContentsHandlers.update(contentId, request);
    if (method === 'DELETE' && contentId) return templateBlockContentsHandlers.remove(contentId);
  }

  // Generic GET for CRUD tables (templates/scope/* handled above by findByScope for business_user)
  const skipGenericTemplatesScope = resource === 'templates' && sub === 'scope';
  if (method === 'GET' && user && !skipGenericTemplatesScope && ['users', 'businesses', 'plans', 'menus', 'screens', 'templates', 'subscriptions', 'content-library'].includes(resource)) {
    const url = new URL(request.url);
    return crudHandlers.handleGet(pathSegments, user, url.searchParams);
  }

  if (process.env.NODE_ENV === 'development') {
    console.warn('[api/proxy] Eşleşmeyen istek:', { method, path: pathSegments, resource, sub, id });
  }
  return Response.json(
    { message: 'Endpoint bulunamadı.', path: pathSegments.join('/') },
    { status: 501 }
  );
}
