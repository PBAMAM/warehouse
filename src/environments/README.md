# Environment Configuration

This directory contains environment-specific configuration files for the Warehouse Management System.

## Files

- `environment.ts` - Default/development environment configuration
- `environment.prod.ts` - Production environment configuration
- `environment.staging.ts` - Staging environment configuration
- `index.ts` - Barrel export for easy imports

## Usage

### Importing Environment Configuration

```typescript
import { environment } from '../environments/environment';
// or
import { environment } from '../environments';
```

### Available Properties

- `production`: boolean - Indicates if the app is running in production mode
- `apiUrl`: string - Base URL for API endpoints
- `appName`: string - Application name
- `version`: string - Application version
- `debug`: boolean - Enable/disable debug mode
- `logLevel`: string - Logging level (debug, info, error)

### Build Commands

- **Development**: `ng serve` (uses environment.ts)
- **Staging**: `ng serve --configuration=staging` (uses environment.staging.ts)
- **Production**: `ng build --configuration=production` (uses environment.prod.ts)

### Adding New Environment Variables

1. Add the new property to all environment files
2. Update this README with the new property description
3. Consider adding TypeScript interfaces for better type safety

## Environment-Specific Values

### Development
- API URL: `http://localhost:3000/api`
- Debug mode: enabled
- Log level: debug

### Staging
- API URL: `https://staging-api.warehouse.com/api`
- Debug mode: enabled
- Log level: info

### Production
- API URL: `https://api.warehouse.com/api`
- Debug mode: disabled
- Log level: error
