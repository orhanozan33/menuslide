# Enterprise Architecture Overview

## Multi-Tenant SaaS Architecture

### Tenant Hierarchy
```
Platform Admin
├── Resellers (Bayi)
│   ├── Reseller Customers (Businesses)
│   │   ├── HQ Businesses
│   │   │   └── Branch Businesses
│   │   └── Independent Businesses
└── Direct Customers (Businesses)
    ├── HQ Businesses
    │   └── Branch Businesses
    └── Independent Businesses
```

### User Roles
1. **Platform Admin** (`super_admin`)
   - Full system access
   - Manage marketplace templates
   - Manage resellers
   - Revenue tracking

2. **Reseller** (`reseller`)
   - Create businesses
   - Assign plans
   - Earn commissions
   - White-label branding

3. **HQ Business Owner** (`business_user` with `is_hq=true`)
   - Control franchise branches
   - Lock templates
   - Set override rules
   - Push templates to branches

4. **Branch Business User** (`business_user` with `parent_business_id`)
   - Use HQ templates
   - Override allowed fields
   - Cannot modify locked aspects

5. **Independent Business User** (`business_user`)
   - Full control over their business
   - Purchase marketplace templates
   - Create custom templates

## Template Types & Ownership

### Template Scopes
1. **System Templates** (`scope='system'`, `is_paid=false`)
   - Free, available to all
   - Platform-managed

2. **Marketplace Templates** (`scope='system'`, `is_paid=true`, `marketplace_status='approved'`)
   - Paid templates
   - Designer-created
   - Available for purchase

3. **User Templates** (`scope='user'`)
   - Private templates
   - Business-specific
   - Not in marketplace

### Template Access Rules
- **Free System**: All businesses
- **Paid Marketplace**: Purchased businesses only
- **User Templates**: Owner business only
- **HQ Templates**: HQ + assigned branches

## Franchise Control System

### HQ Capabilities
- Create global templates
- Assign templates to branches (required or optional)
- Lock template aspects:
  - Full lock: No customization
  - Layout lock: Blocks cannot move/resize
  - Colors lock: Color scheme fixed
  - Logo lock: Logo cannot change
  - Content lock: Text/images fixed

### Override Rules
HQ can allow branches to override:
- Prices
- Descriptions
- Language
- Images
- Content

### Realtime Updates
- HQ changes → All branches update instantly (Supabase Realtime)
- Branch overrides → Only affect that branch

## White-Label System

### Reseller Branding
- Custom domain (e.g., `menu.reseller.com`)
- Custom logo
- Custom colors (primary, secondary)
- Custom login page
- Remove platform branding
- Custom CSS

### Domain Routing
- Check `whitelabel_settings.custom_domain`
- Route to reseller-specific UI
- Apply branding settings

## Revenue Model

### Subscription Revenue Split
```
Total Payment: $100
├── Platform: $70 (70%)
├── Reseller: $20 (20%)
└── Stripe Fees: $10 (2.9% + $0.30)
```

### Template Purchase Revenue Split
```
Template Price: $50
├── Platform: $35 (70%)
├── Designer: $10 (20%)
└── Reseller: $5 (10% if purchased by reseller customer)
```

### Commission Calculation
- Reseller commission: Configurable per reseller (default 10-20%)
- Designer commission: Set per template (default 0-30%)
- Platform: Remaining after commissions

## Security & Permissions

### Template Access
- Verify ownership before access
- Check purchase status
- Validate license expiration
- Enforce HQ locks

### Business Access
- Reseller can only access their customers
- HQ can access branch data
- Branch cannot access HQ data
- Platform admin: Full access

### API Guards
- `@ResellerGuard`: Reseller access only
- `@HQGuard`: HQ business access only
- `@BranchGuard`: Branch access with override checks
- `@TemplateOwnerGuard`: Template ownership verification

## Database Design Principles

1. **Multi-tenancy**: All tables include `business_id` or `reseller_id`
2. **Soft deletes**: Use `is_active` flags
3. **Audit trails**: `created_at`, `updated_at`, `created_by`
4. **Cascading deletes**: Proper foreign key constraints
5. **Indexes**: Optimize for common queries (business_id, status, etc.)

## Scalability Considerations

1. **Database**: Partition by business_id for large datasets
2. **Caching**: Redis for template metadata, pricing
3. **CDN**: Template preview images, logos
4. **Queue**: Background jobs for revenue splits, notifications
5. **Realtime**: Supabase Realtime for instant updates

## API Structure

```
/api
├── /marketplace
│   ├── GET /templates (public marketplace)
│   ├── POST /templates/:id/purchase
│   └── GET /templates/purchased
├── /franchise
│   ├── POST /hq/templates/assign
│   ├── POST /hq/templates/lock
│   ├── GET /branches
│   └── POST /branches/:id/override-rules
├── /reseller
│   ├── GET /dashboard
│   ├── GET /customers
│   ├── GET /commissions
│   └── PUT /whitelabel
└── /admin
    ├── GET /marketplace/pending
    ├── POST /marketplace/:id/approve
    └── GET /revenue
```
