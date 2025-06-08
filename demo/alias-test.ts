// Test file for Nuxt/Next alias imports

// Standard relative imports (already supported)
import { utils } from './utils';
import { ComponentService } from './service';

// Nuxt/Next alias imports (new feature)
import { SomeComponent } from '@/components/SomeComponent';
import { ApiService } from '~/services/ApiService';
import { Config } from '@/config/app-config';

// Nuxt 3 specific aliases
import { definePageMeta } from '#imports';
import { AppHeader } from '#components/AppHeader';

export class AliasTest {
    constructor() {
        console.log('Testing alias imports');
    }
} 