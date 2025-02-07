import eslint from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    eslint.configs.recommended,
    ...tseslint.configs.strictTypeChecked,
    ...tseslint.configs.stylisticTypeChecked,
    {
        plugins: {
            '@stylistic': stylistic
        },
        languageOptions: {
            parserOptions: {
                project: true
            }
        },
        // ESLint
        rules: {
            'no-console': 'warn',
            'no-unused-vars': 'warn',
            'prefer-const': 'error'
        }
    },
    // TypeScript
    {
        rules: {
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/explicit-function-return-type': 'warn',
            '@typescript-eslint/no-unused-vars': 'warn'
        }
    },
    // Stylistic
    {
        rules: {
            '@stylistic/indent': ['error', 4],
            '@stylistic/quotes': ['error', 'single'],
            '@stylistic/semi': ['error', 'always'],
            '@stylistic/comma-dangle': ['error', 'never'],
            '@stylistic/brace-style': ['error', '1tbs'],
            '@stylistic/max-len': ['error', { 'code': 100 }],
            '@stylistic/space-before-blocks': ['error', 'always'],
            '@stylistic/space-before-function-paren': ['error', {
                'anonymous': 'always',
                'named': 'never',
                'asyncArrow': 'always'
            }],
            '@stylistic/space-in-parens': ['error', 'never'],
            '@stylistic/array-bracket-spacing': ['error', 'never'],
            '@stylistic/object-curly-spacing': ['error', 'always']
        }
    }
);
