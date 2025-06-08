module.exports = {
  "env": {
    "browser": true,
    "es6": true,
    "node": true
  },
  "extends": [
    "eslint:recommended"
  ],
  "globals": {
    "wx": "readonly",
    "App": "readonly",
    "Page": "readonly",
    "Component": "readonly",
    "getApp": "readonly",
    "getCurrentPages": "readonly"
  },
  "parserOptions": {
    "ecmaVersion": 2018,
    "sourceType": "module"
  },
  "rules": {
    // 代码质量规则
    "no-console": "warn",
    "no-debugger": "error",
    "no-unused-vars": "warn",
    "no-undef": "error",
    
    // 代码风格规则
    "indent": ["error", 2],
    "quotes": ["error", "single"],
    "semi": ["error", "never"],
    "comma-dangle": ["error", "never"],
    
    // ES6规则
    "prefer-const": "error",
    "no-var": "error",
    "arrow-spacing": "error",
    
    // 最佳实践
    "eqeqeq": "error",
    "no-eval": "error",
    "no-implied-eval": "error",
    "no-new-func": "error",
    
    // 微信小程序特定规则
    "no-restricted-globals": ["error", "window", "document"]
  }
} 