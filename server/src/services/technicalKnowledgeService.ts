/**
 * Technical Knowledge Analysis Service
 * Analyzes answers for technical accuracy based on expected keywords and concepts
 */

export interface ExpectedKeyword {
  primary: string;
  synonyms: string[];
  weight: number; // importance of this keyword (1-5 scale)
  category: 'technical' | 'concept' | 'methodology' | 'tool' | 'general';
}

export interface TechnicalAnalysis {
  overallScore: number; // 0-100 scale
  keywordMatchScore: number; // 0-100 scale based on keyword coverage
  conceptCoverageScore: number; // 0-100 scale based on concept understanding
  relevanceScore: number; // 0-100 scale based on answer relevance
  breakdown: {
    totalExpectedKeywords: number;
    matchedKeywords: MatchedKeyword[];
    missedKeywords: string[];
    unexpectedKeywords: string[];
    categoryScores: {
      technical: number;
      concept: number;
      methodology: number;
      tool: number;
      general: number;
    };
    answerlength: number;
    keywordDensity: number; // percentage of technical words in answer
  };
}

export interface MatchedKeyword {
  expected: string;
  found: string;
  matchType: 'exact' | 'synonym' | 'partial';
  weight: number;
  category: string;
}

export class TechnicalKnowledgeService {
  // Expanded technical synonyms database with more comprehensive coverage
  private readonly SYNONYM_GROUPS = new Map<string, string[]>([
    // React/Frontend
    ['react', ['reactjs', 'react.js', 'react js']],
    ['hooks', ['hook', 'react hooks', 'react hook']],
    ['state', ['states', 'state management', 'component state']],
    ['props', ['properties', 'component props', 'react props']],
    ['component', ['components', 'react component', 'functional component', 'class component']],
    ['jsx', ['jsx syntax', 'react jsx']],
    ['virtual dom', ['vdom', 'virtual document object model']],
    ['useeffect', ['use effect', 'effect hook']],
    ['usestate', ['use state', 'state hook']],
    
    // Backend/Database
    ['api', ['application programming interface', 'rest api', 'web api']],
    ['database', ['db', 'data base', 'storage']],
    ['sql', ['structured query language', 'mysql', 'postgresql']],
    ['nosql', ['no sql', 'non-relational', 'document database']],
    ['indexing', ['index', 'database index', 'db indexing']],
    ['query', ['queries', 'database query', 'sql query']],
    ['optimization', ['optimisation', 'performance optimization', 'optimize']],
    
    // Programming Concepts
    ['algorithm', ['algorithms', 'algo', 'algorithmic']],
    ['data structure', ['data structures', 'ds', 'datastructure']],
    ['object oriented', ['oop', 'object-oriented programming', 'object oriented programming']],
    ['functional programming', ['fp', 'functional paradigm']],
    ['asynchronous', ['async', 'asynchronously', 'non-blocking']],
    ['synchronous', ['sync', 'synchronously', 'blocking']],
    ['recursion', ['recursive', 'recursive function']],
    
    // DevOps/Tools
    ['git', ['version control', 'source control']],
    ['deployment', ['deploy', 'deploying', 'production deployment']],
    ['testing', ['unit testing', 'test', 'automated testing']],
    ['debugging', ['debug', 'troubleshooting', 'bug fixing']],
    ['ci/cd', ['continuous integration', 'continuous deployment', 'cicd']],
    
    // General Software Development
    ['scalability', ['scalable', 'scale', 'scaling']],
    ['performance', ['efficiency', 'speed', 'optimization']],
    ['security', ['secure', 'safety', 'protection']],
    ['maintainability', ['maintainable', 'maintenance', 'clean code']],
    ['architecture', ['system architecture', 'software architecture', 'design patterns']],
    ['framework', ['frameworks', 'library', 'libraries']],
    ['microservices', ['micro services', 'service-oriented architecture', 'soa']],
    ['load balancing', ['load balancer', 'traffic distribution']],
    
    // Data Analysis
    ['visualization', ['visualisation', 'data viz', 'charts', 'graphs']],
    ['analytics', ['analysis', 'data analysis', 'statistical analysis']],
    ['big data', ['large datasets', 'data processing']],
    
    // AI/Machine Learning Core
    ['machine learning', ['ml', 'artificial intelligence', 'ai']],
    ['deep learning', ['dl', 'neural networks', 'deep neural networks']],
    ['artificial intelligence', ['ai', 'machine intelligence', 'cognitive computing']],
    ['neural network', ['neural networks', 'neural net', 'artificial neural network', 'ann']],
    ['algorithm', ['algorithms', 'ml algorithm', 'learning algorithm']],
    ['model', ['models', 'ml model', 'ai model', 'predictive model']],
    ['training', ['model training', 'training data', 'train model']],
    ['prediction', ['predictions', 'inference', 'forecasting']],
    ['classification', ['classify', 'classifier', 'categorization']],
    ['regression', ['linear regression', 'logistic regression', 'regressor']],
    ['clustering', ['cluster analysis', 'unsupervised clustering', 'k-means']],
    
    // ML Techniques & Methods
    ['supervised learning', ['supervised', 'supervised ml', 'labeled data']],
    ['unsupervised learning', ['unsupervised', 'unsupervised ml', 'unlabeled data']],
    ['reinforcement learning', ['rl', 'reward-based learning', 'agent-environment']],
    ['feature engineering', ['feature extraction', 'feature selection', 'feature preprocessing']],
    ['feature', ['features', 'input features', 'predictors', 'variables']],
    ['overfitting', ['overfit', 'high variance', 'model overfitting']],
    ['underfitting', ['underfit', 'high bias', 'model underfitting']],
    ['bias-variance tradeoff', ['bias variance', 'model complexity']],
    ['cross validation', ['cross-validation', 'cv', 'k-fold validation']],
    ['hyperparameter', ['hyperparameters', 'model parameters', 'tuning parameters']],
    ['gradient descent', ['gradient-descent', 'optimization algorithm', 'backpropagation']],
    
    // Deep Learning Specific
    ['convolutional neural network', ['cnn', 'conv net', 'convnet']],
    ['recurrent neural network', ['rnn', 'lstm', 'gru']],
    ['transformer', ['transformers', 'attention mechanism', 'self-attention']],
    ['generative adversarial network', ['gan', 'generative model', 'adversarial training']],
    ['autoencoder', ['autoencoders', 'encoder-decoder', 'dimensionality reduction']],
    ['activation function', ['activation', 'relu', 'sigmoid', 'tanh']],
    ['loss function', ['loss', 'cost function', 'objective function']],
    ['backpropagation', ['backprop', 'error propagation', 'gradient computation']],
    ['dropout', ['regularization', 'model regularization', 'prevent overfitting']],
    ['batch normalization', ['batchnorm', 'normalization layer']],
    
    // NLP & Language Models
    ['natural language processing', ['nlp', 'text processing', 'language understanding']],
    ['large language model', ['llm', 'language model', 'generative ai']],
    ['tokenization', ['tokenize', 'text tokenization', 'word segmentation']],
    ['embedding', ['embeddings', 'word embeddings', 'vector representations']],
    ['sentiment analysis', ['sentiment classification', 'emotion detection']],
    ['named entity recognition', ['ner', 'entity extraction', 'entity identification']],
    ['text generation', ['language generation', 'text synthesis']],
    ['fine-tuning', ['model fine-tuning', 'transfer learning', 'domain adaptation']],
    
    // Computer Vision
    ['computer vision', ['cv', 'image processing', 'visual recognition']],
    ['image classification', ['image recognition', 'visual classification']],
    ['object detection', ['object recognition', 'bounding box detection']],
    ['image segmentation', ['semantic segmentation', 'pixel classification']],
    ['convolutional layer', ['conv layer', 'feature extraction layer']],
    ['pooling', ['max pooling', 'average pooling', 'downsampling']],
    
    // Data & Tools
    ['dataset', ['datasets', 'training data', 'data collection']],
    ['data preprocessing', ['data cleaning', 'data preparation', 'data transformation']],
    ['data augmentation', ['synthetic data', 'data expansion']],
    ['tensorflow', ['tf', 'google tensorflow']],
    ['pytorch', ['torch', 'facebook pytorch']],
    ['scikit-learn', ['sklearn', 'sci-kit learn']],
    ['pandas', ['data manipulation', 'dataframe']],
    ['numpy', ['numerical python', 'array processing']],
    ['matplotlib', ['plotting', 'data visualization']],
    ['jupyter', ['jupyter notebook', 'interactive computing']],
    
    // Evaluation & Metrics
    ['accuracy', ['model accuracy', 'classification accuracy']],
    ['precision', ['positive predictive value']],
    ['recall', ['sensitivity', 'true positive rate']],
    ['f1 score', ['f1-score', 'harmonic mean', 'f-measure']],
    ['confusion matrix', ['error matrix', 'classification table']],
    ['auc', ['area under curve', 'roc auc']],
    ['mean squared error', ['mse', 'squared loss']],
    ['mean absolute error', ['mae', 'absolute loss']],
    
    // Project Management
    ['agile', ['scrum', 'sprint', 'iterative development']],
    ['collaboration', ['teamwork', 'team collaboration', 'working together']],
    ['documentation', ['docs', 'technical documentation']],
    ['requirements', ['specifications', 'specs', 'business requirements']],

    // Java & Spring Ecosystem
    ['java', ['jdk', 'jvm', 'java virtual machine', 'openjdk']],
    ['spring', ['spring framework', 'springframework']],
    ['spring boot', ['springboot', 'spring-boot', 'spring application']],
    ['spring mvc', ['spring web mvc', 'mvc framework']],
    ['spring security', ['authentication', 'authorization', 'security framework']],
    ['spring data', ['jpa', 'hibernate', 'data access']],
    ['maven', ['maven build', 'pom.xml', 'dependency management']],
    ['gradle', ['gradle build', 'build.gradle', 'groovy dsl']],
    ['tomcat', ['apache tomcat', 'servlet container']],
    ['junit', ['unit testing', 'test framework', 'testing framework']],

    // Backend Technologies
    ['microservices', ['micro services', 'service architecture', 'distributed systems']],
    ['rest api', ['restful api', 'web service', 'http api']],
    ['graphql', ['graph ql', 'query language', 'graph api']],
    ['soap', ['soap web services', 'xml web services']],
    ['json', ['javascript object notation', 'data format']],
    ['xml', ['extensible markup language', 'markup language']],

    // Databases (expanded)
    ['mysql', ['my sql', 'relational database', 'rdbms']],
    ['postgresql', ['postgres', 'postgre sql', 'elephant database']],
    ['mongodb', ['mongo db', 'document database', 'nosql database']],
    ['redis', ['in-memory database', 'cache', 'key-value store']],
    ['elasticsearch', ['elastic search', 'search engine', 'full-text search']],
    ['cassandra', ['apache cassandra', 'wide-column store']],
    ['oracle', ['oracle database', 'oracle db']],

    // Frontend Technologies (expanded)
    ['angular', ['angularjs', 'angular framework', 'typescript framework']],
    ['vue', ['vuejs', 'vue.js', 'progressive framework']],
    ['typescript', ['ts', 'typed javascript', 'microsoft typescript']],
    ['javascript', ['js', 'ecmascript', 'es6', 'es2015']],
    ['webpack', ['module bundler', 'build tool']],
    ['vite', ['build tool', 'dev server', 'fast build']],
    ['tailwind', ['tailwind css', 'utility css', 'css framework']],
    ['bootstrap', ['css framework', 'responsive framework']],
    ['sass', ['scss', 'css preprocessor']],

    // Cloud & DevOps (expanded)
    ['aws', ['amazon web services', 'amazon cloud']],
    ['azure', ['microsoft azure', 'azure cloud']],
    ['gcp', ['google cloud platform', 'google cloud']],
    ['docker', ['containerization', 'container', 'dockerization']],
    ['kubernetes', ['k8s', 'container orchestration', 'k8 cluster']],
    ['jenkins', ['ci/cd pipeline', 'build automation']],
    ['github actions', ['gh actions', 'workflow automation']],
    ['terraform', ['infrastructure as code', 'iac']],
    ['ansible', ['configuration management', 'automation tool']],

    // Programming Languages
    ['python', ['py', 'python programming', 'python language']],
    ['c++', ['cpp', 'c plus plus', 'cplusplus']],
    ['c#', ['csharp', 'c sharp', 'dotnet']],
    ['go', ['golang', 'go language', 'google go']],
    ['rust', ['rust language', 'systems programming']],
    ['kotlin', ['kotlin language', 'jetbrains kotlin']],
    ['swift', ['swift language', 'ios development']],
    ['php', ['php language', 'web development']],
    ['ruby', ['ruby language', 'ruby programming']],

    // Additional Tools & Technologies
    ['postman', ['api testing', 'rest client']],
    ['swagger', ['api documentation', 'openapi']],
    ['jira', ['project management', 'issue tracking']],
    ['confluence', ['documentation platform', 'wiki']],
    ['slack', ['team communication', 'messaging platform']],
    ['nginx', ['web server', 'reverse proxy', 'load balancer']],
    ['apache', ['apache http server', 'web server']],
    ['linux', ['unix', 'operating system', 'server os']],
    ['bash', ['shell scripting', 'command line']],
    ['powershell', ['windows shell', 'automation scripting']]
  ]);

  // Common technical term patterns for automatic detection
  private readonly TECHNICAL_PATTERNS = [
    /\b[A-Z][a-z]+(?:[A-Z][a-z]*)*\b/, // CamelCase (e.g., SpringBoot, JavaScript)
    /\b[a-z]+\.[a-z]+(?:\.[a-z]+)*\b/, // Dotted notation (e.g., spring.framework)
    /\b[a-z]+-[a-z]+(?:-[a-z]+)*\b/, // Hyphenated (e.g., spring-boot, vue-cli)
    /\b[A-Z]{2,}\b/, // Acronyms (e.g., API, SQL, AWS)
    /\b\w*[Jj]ava\w*\b/, // Java-related terms
    /\b\w*[Ss]pring\w*\b/, // Spring-related terms
    /\b\w*[Dd]atabase\w*\b/, // Database-related terms
    /\b\w*[Aa]pi\w*\b/, // API-related terms
    /\b\w*[Ff]ramework\w*\b/, // Framework-related terms
  ];

  // Comprehensive list of technical domains for automatic categorization
  private readonly TECHNICAL_DOMAINS = {
    backend: ['server', 'api', 'database', 'microservice', 'spring', 'java', 'node', 'express', 'django', 'flask'],
    frontend: ['react', 'angular', 'vue', 'javascript', 'typescript', 'html', 'css', 'ui', 'ux', 'component'],
    database: ['sql', 'mysql', 'postgres', 'mongodb', 'redis', 'elasticsearch', 'oracle', 'query', 'schema'],
    cloud: ['aws', 'azure', 'gcp', 'docker', 'kubernetes', 'serverless', 'lambda', 'ec2', 's3'],
    devops: ['ci/cd', 'jenkins', 'gitlab', 'docker', 'kubernetes', 'terraform', 'ansible', 'deployment'],
    mobile: ['android', 'ios', 'react native', 'flutter', 'swift', 'kotlin', 'mobile app'],
    ai_ml: ['machine learning', 'ai', 'neural network', 'tensorflow', 'pytorch', 'nlp', 'computer vision'],
    testing: ['junit', 'testng', 'selenium', 'unit test', 'integration test', 'automated testing'],
    tools: ['git', 'maven', 'gradle', 'webpack', 'npm', 'yarn', 'postman', 'jira']
  };

  /**
   * Analyze technical knowledge with enhanced automatic detection
   */
  analyzeTechnicalKnowledge(
    userAnswer: string, 
    expectedKeywords: ExpectedKeyword[], 
    questionContext?: string
  ): TechnicalAnalysis {
    if (!userAnswer || userAnswer.trim().length < 10) {
      return this.getDefaultAnalysis();
    }

    const cleanAnswer = this.cleanText(userAnswer);
    const answerWords = this.extractWords(cleanAnswer);
    
    // Auto-detect technical terms from the answer
    const autoDetectedTerms = this.autoDetectTechnicalTerms(userAnswer);
    
    // Enhance expected keywords with auto-detected terms
    const enhancedExpectedKeywords = this.enhanceExpectedKeywords(expectedKeywords, autoDetectedTerms, questionContext);
    
    // Find matched keywords using enhanced detection
    const matchedKeywords = this.findMatchedKeywordsEnhanced(cleanAnswer, answerWords, enhancedExpectedKeywords);
    const missedKeywords = this.findMissedKeywords(enhancedExpectedKeywords, matchedKeywords);
    const unexpectedKeywords = this.findUnexpectedTechnicalWords(answerWords, enhancedExpectedKeywords);

    // Calculate scores
    const keywordMatchScore = this.calculateKeywordMatchScore(matchedKeywords, enhancedExpectedKeywords);
    const conceptCoverageScore = this.calculateConceptCoverageScore(matchedKeywords, enhancedExpectedKeywords);
    const relevanceScore = this.calculateRelevanceScore(cleanAnswer, enhancedExpectedKeywords, questionContext);
    const categoryScores = this.calculateCategoryScores(matchedKeywords, enhancedExpectedKeywords);

    // Calculate overall score with bonus for auto-detected technical terms
    const autoDetectionBonus = Math.min(15, autoDetectedTerms.length * 2);
    const baseScore = (keywordMatchScore * 0.4) + (conceptCoverageScore * 0.3) + (relevanceScore * 0.3);
    const overallScore = Math.min(100, Math.round(baseScore + autoDetectionBonus));

    const keywordDensity = this.calculateKeywordDensity(matchedKeywords, answerWords);

    console.log('🔍 Technical Analysis Results:');
    console.log('  - Auto-detected terms:', autoDetectedTerms.length);
    console.log('  - Enhanced keywords:', enhancedExpectedKeywords.length);
    console.log('  - Auto-detection bonus:', autoDetectionBonus);

    return {
      overallScore,
      keywordMatchScore: Math.round(keywordMatchScore),
      conceptCoverageScore: Math.round(conceptCoverageScore),
      relevanceScore: Math.round(relevanceScore),
      breakdown: {
        totalExpectedKeywords: enhancedExpectedKeywords.length,
        matchedKeywords,
        missedKeywords,
        unexpectedKeywords,
        categoryScores: {
          technical: Math.round(categoryScores.technical),
          concept: Math.round(categoryScores.concept),
          methodology: Math.round(categoryScores.methodology),
          tool: Math.round(categoryScores.tool),
          general: Math.round(categoryScores.general)
        },
        answerlength: userAnswer.length,
        keywordDensity: Math.round(keywordDensity * 100) / 100
      }
    };
  }

  /**
   * Automatically detect technical terms in the user's answer
   */
  private autoDetectTechnicalTerms(userAnswer: string): string[] {
    const detectedTerms = new Set<string>();
    const cleanAnswer = userAnswer.toLowerCase();
    
    // 1. Pattern-based detection
    for (const pattern of this.TECHNICAL_PATTERNS) {
      const matches = userAnswer.match(new RegExp(pattern.source, 'gi'));
      if (matches) {
        matches.forEach(match => {
          if (match.length > 2 && !this.isCommonWord(match.toLowerCase())) {
            detectedTerms.add(match.toLowerCase());
          }
        });
      }
    }

    // 2. Domain-based detection
    for (const [domain, terms] of Object.entries(this.TECHNICAL_DOMAINS)) {
      for (const term of terms) {
        if (cleanAnswer.includes(term.toLowerCase())) {
          detectedTerms.add(term.toLowerCase());
        }
      }
    }

    // 3. Synonym database matching
    for (const [primary, synonyms] of this.SYNONYM_GROUPS) {
      if (cleanAnswer.includes(primary)) {
        detectedTerms.add(primary);
      }
      for (const synonym of synonyms) {
        if (cleanAnswer.includes(synonym.toLowerCase())) {
          detectedTerms.add(primary);
          detectedTerms.add(synonym.toLowerCase());
        }
      }
    }

    // 4. Common tech suffixes/prefixes
    const techPatterns = [
      /\w*(js|ts|py|cpp|sql|api|db|ui|ux)\w*/gi,
      /\w*(framework|library|service|server|client)\w*/gi,
      /\w*(testing|deployment|development|programming)\w*/gi
    ];

    for (const pattern of techPatterns) {
      const matches = userAnswer.match(pattern);
      if (matches) {
        matches.forEach(match => {
          if (match.length > 3 && !this.isCommonWord(match.toLowerCase())) {
            detectedTerms.add(match.toLowerCase());
          }
        });
      }
    }

    return Array.from(detectedTerms).slice(0, 20); // Limit to prevent over-detection
  }

  /**
   * Check if a word is a common non-technical word
   */
  private isCommonWord(word: string): boolean {
    const commonWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those',
      'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
      'my', 'your', 'his', 'her', 'its', 'our', 'their', 'myself', 'yourself',
      'himself', 'herself', 'itself', 'ourselves', 'themselves', 'what', 'which',
      'who', 'whom', 'whose', 'where', 'when', 'why', 'how', 'all', 'any', 'both',
      'each', 'few', 'more', 'most', 'other', 'some', 'such', 'only', 'own', 'same',
      'so', 'than', 'too', 'very', 'just', 'now', 'then', 'here', 'there', 'once',
      'during', 'before', 'after', 'above', 'below', 'up', 'down', 'out', 'off',
      'over', 'under', 'again', 'further', 'then', 'once', 'work', 'working',
      'project', 'projects', 'using', 'used', 'use', 'application', 'system',
      'build', 'built', 'create', 'created', 'make', 'made', 'get', 'got', 'take',
      'also', 'well', 'like', 'good', 'better', 'best', 'new', 'first', 'last',
      'different', 'important', 'right', 'wrong', 'easy', 'hard', 'simple', 'complex'
    ]);
    
    return commonWords.has(word) || word.length < 3;
  }

  /**
   * Enhance expected keywords with auto-detected technical terms
   */
  private enhanceExpectedKeywords(
    originalKeywords: ExpectedKeyword[],
    autoDetectedTerms: string[],
    questionContext?: string
  ): ExpectedKeyword[] {
    const enhanced = [...originalKeywords];
    const existingTerms = new Set(
      originalKeywords.map(kw => kw.primary.toLowerCase())
    );

    // Add auto-detected terms as expected keywords
    autoDetectedTerms.forEach(term => {
      if (!existingTerms.has(term) && term.length > 2) {
        const category = this.categorizeTechnicalTerm(term);
        const weight = this.calculateTermWeight(term, questionContext);
        
        enhanced.push({
          primary: term,
          synonyms: this.getSynonymsForTerm(term),
          weight,
          category
        });
        
        existingTerms.add(term);
      }
    });

    return enhanced;
  }

  /**
   * Categorize a technical term automatically
   */
  private categorizeTechnicalTerm(term: string): 'technical' | 'concept' | 'methodology' | 'tool' | 'general' {
    const termLower = term.toLowerCase();
    
    // Check against domain mappings
    for (const [domain, terms] of Object.entries(this.TECHNICAL_DOMAINS)) {
      if (terms.some(domainTerm => termLower.includes(domainTerm) || domainTerm.includes(termLower))) {
        if (['tools'].includes(domain)) return 'tool';
        if (['testing', 'devops'].includes(domain)) return 'methodology';
        return 'technical';
      }
    }

    // Pattern-based categorization
    if (termLower.includes('framework') || termLower.includes('library') || 
        termLower.includes('tool') || termLower.includes('sdk')) {
      return 'tool';
    }
    
    if (termLower.includes('pattern') || termLower.includes('methodology') || 
        termLower.includes('testing') || termLower.includes('deployment')) {
      return 'methodology';
    }
    
    if (termLower.includes('concept') || termLower.includes('principle') || 
        termLower.includes('paradigm')) {
      return 'concept';
    }

    // Default to technical if it looks like a technology name
    if (/^[A-Z]/.test(term) || termLower.includes('js') || termLower.includes('api') ||
        termLower.includes('db') || termLower.includes('sql')) {
      return 'technical';
    }

    return 'general';
  }

  /**
   * Calculate weight for an auto-detected term
   */
  private calculateTermWeight(term: string, questionContext?: string): number {
    let weight = 2; // Base weight
    
    // Higher weight if mentioned in question context
    if (questionContext && questionContext.toLowerCase().includes(term.toLowerCase())) {
      weight += 2;
    }
    
    // Higher weight for specific technology names
    if (term.length > 5 && /^[A-Z]/.test(term)) {
      weight += 1;
    }
    
    // Lower weight for very common terms
    const commonTechTerms = ['project', 'system', 'application', 'development', 'programming'];
    if (commonTechTerms.some(common => term.toLowerCase().includes(common))) {
      weight = Math.max(1, weight - 1);
    }
    
    return Math.min(5, weight);
  }

  /**
   * Get synonyms for a term from the database or generate common variations
   */
  private getSynonymsForTerm(term: string): string[] {
    const termLower = term.toLowerCase();
    
    // Check if we have synonyms in our database
    if (this.SYNONYM_GROUPS.has(termLower)) {
      return this.SYNONYM_GROUPS.get(termLower) || [];
    }
    
    // Generate common variations
    const synonyms: string[] = [];
    
    // Add variations with different spacing/hyphenation
    if (term.includes('-')) {
      synonyms.push(term.replace(/-/g, ' '));
      synonyms.push(term.replace(/-/g, ''));
    }
    
    if (term.includes(' ')) {
      synonyms.push(term.replace(/ /g, '-'));
      synonyms.push(term.replace(/ /g, ''));
    }
    
    // Add common suffixes/prefixes
    if (termLower.endsWith('js')) {
      synonyms.push(term + ' framework', term + ' library');
    }
    
    if (termLower.includes('framework')) {
      synonyms.push(term.replace(/framework/gi, ''));
    }
    
    return synonyms.filter(s => s !== term && s.length > 2);
  }

  /**
   * Enhanced keyword matching with fuzzy matching
   */
  private findMatchedKeywordsEnhanced(
    cleanAnswer: string, 
    answerWords: string[], 
    expectedKeywords: ExpectedKeyword[]
  ): MatchedKeyword[] {
    const matched: MatchedKeyword[] = [];

    for (const expected of expectedKeywords) {
      const match = this.findKeywordMatchEnhanced(cleanAnswer, answerWords, expected);
      if (match) {
        matched.push(match);
      }
    }

    return matched;
  }

  /**
   * Enhanced keyword matching with fuzzy search
   */
  private findKeywordMatchEnhanced(
    cleanAnswer: string, 
    answerWords: string[], 
    expected: ExpectedKeyword
  ): MatchedKeyword | null {
    const primaryKeyword = expected.primary.toLowerCase();
    
    // Exact match
    if (cleanAnswer.includes(primaryKeyword)) {
      return {
        expected: expected.primary,
        found: primaryKeyword,
        matchType: 'exact',
        weight: expected.weight,
        category: expected.category
      };
    }

    // Synonym matches
    for (const synonym of expected.synonyms) {
      const synonymLower = synonym.toLowerCase();
      if (cleanAnswer.includes(synonymLower)) {
        return {
          expected: expected.primary,
          found: synonym,
          matchType: 'synonym',
          weight: expected.weight,
          category: expected.category
        };
      }
    }

    // Fuzzy matching for similar terms
    const fuzzyMatch = this.findFuzzyMatch(cleanAnswer, answerWords, primaryKeyword);
    if (fuzzyMatch) {
      return {
        expected: expected.primary,
        found: fuzzyMatch,
        matchType: 'partial',
        weight: expected.weight * 0.8, // Reduced weight for fuzzy matches
        category: expected.category
      };
    }

    // Check database synonyms
    const synonymGroup = this.SYNONYM_GROUPS.get(primaryKeyword);
    if (synonymGroup) {
      for (const dbSynonym of synonymGroup) {
        if (cleanAnswer.includes(dbSynonym.toLowerCase())) {
          return {
            expected: expected.primary,
            found: dbSynonym,
            matchType: 'synonym',
            weight: expected.weight,
            category: expected.category
          };
        }
      }
    }

    return null;
  }

  /**
   * Find fuzzy matches using Levenshtein distance and substring matching
   */
  private findFuzzyMatch(cleanAnswer: string, answerWords: string[], target: string): string | null {
    const targetLower = target.toLowerCase();
    
    // Look for substring matches
    for (const word of answerWords) {
      if (word.length > 3 && targetLower.length > 3) {
        // Check if one is substring of another
        if (word.includes(targetLower) || targetLower.includes(word)) {
          return word;
        }
        
        // Check for similar beginnings (at least 4 characters)
        if (word.length > 4 && targetLower.length > 4 &&
            word.substring(0, 4) === targetLower.substring(0, 4)) {
          return word;
        }
      }
    }
    
    return null;
  }

  /**
   * Clean and normalize text for analysis
   */
  private cleanText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Extract meaningful words from text
   */
  private extractWords(text: string): string[] {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 
      'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those'
    ]);

    return text
      .split(' ')
      .filter(word => word.length > 2 && !stopWords.has(word));
  }

  /**
   * Find keywords that match between user answer and expected keywords (legacy method)
   */
  private findMatchedKeywords(
    cleanAnswer: string, 
    answerWords: string[], 
    expectedKeywords: ExpectedKeyword[]
  ): MatchedKeyword[] {
    const matched: MatchedKeyword[] = [];

    for (const expected of expectedKeywords) {
      const match = this.findKeywordMatch(cleanAnswer, answerWords, expected);
      if (match) {
        matched.push(match);
      }
    }

    return matched;
  }

  /**
   * Find a specific keyword match in the answer
   */
  private findKeywordMatch(
    cleanAnswer: string, 
    answerWords: string[], 
    expected: ExpectedKeyword
  ): MatchedKeyword | null {
    const primaryKeyword = expected.primary.toLowerCase();
    
    // Check for exact match
    if (cleanAnswer.includes(primaryKeyword)) {
      return {
        expected: expected.primary,
        found: primaryKeyword,
        matchType: 'exact',
        weight: expected.weight,
        category: expected.category
      };
    }

    // Check for synonym matches
    for (const synonym of expected.synonyms) {
      const synonymLower = synonym.toLowerCase();
      if (cleanAnswer.includes(synonymLower)) {
        return {
          expected: expected.primary,
          found: synonym,
          matchType: 'synonym',
          weight: expected.weight,
          category: expected.category
        };
      }
    }

    // Check for partial matches (for compound terms)
    const keywordParts = primaryKeyword.split(' ');
    if (keywordParts.length > 1) {
      const partialMatches = keywordParts.filter(part => 
        part.length > 2 && answerWords.includes(part)
      );
      
      if (partialMatches.length >= keywordParts.length / 2) {
        return {
          expected: expected.primary,
          found: partialMatches.join(' '),
          matchType: 'partial',
          weight: expected.weight * 0.7, // Reduced weight for partial matches
          category: expected.category
        };
      }
    }

    // Check synonyms from the database
    const synonymGroup = this.SYNONYM_GROUPS.get(primaryKeyword);
    if (synonymGroup) {
      for (const dbSynonym of synonymGroup) {
        if (cleanAnswer.includes(dbSynonym.toLowerCase())) {
          return {
            expected: expected.primary,
            found: dbSynonym,
            matchType: 'synonym',
            weight: expected.weight,
            category: expected.category
          };
        }
      }
    }

    return null;
  }

  /**
   * Find keywords that were expected but not found
   */
  private findMissedKeywords(
    expectedKeywords: ExpectedKeyword[], 
    matchedKeywords: MatchedKeyword[]
  ): string[] {
    const matchedSet = new Set(matchedKeywords.map(m => m.expected.toLowerCase()));
    return expectedKeywords
      .filter(expected => !matchedSet.has(expected.primary.toLowerCase()))
      .map(expected => expected.primary);
  }

  /**
   * Find technical words that weren't expected but are still valuable
   */
  private findUnexpectedTechnicalWords(
    answerWords: string[], 
    expectedKeywords: ExpectedKeyword[]
  ): string[] {
    const expectedSet = new Set();
    expectedKeywords.forEach(expected => {
      expectedSet.add(expected.primary.toLowerCase());
      expected.synonyms.forEach(syn => expectedSet.add(syn.toLowerCase()));
    });

    // Common technical terms that might be valuable even if not expected
    const technicalTerms = new Set([
      'javascript', 'python', 'java', 'typescript', 'html', 'css',
      'nodejs', 'express', 'mongodb', 'postgresql', 'redis',
      'docker', 'kubernetes', 'aws', 'azure', 'gcp',
      'webpack', 'babel', 'npm', 'yarn', 'json', 'xml',
      'rest', 'graphql', 'websocket', 'http', 'https',
      'authentication', 'authorization', 'jwt', 'oauth'
    ]);

    return answerWords
      .filter(word => technicalTerms.has(word) && !expectedSet.has(word))
      .slice(0, 5); // Limit to top 5 unexpected technical terms
  }

  /**
   * Calculate keyword match score
   */
  private calculateKeywordMatchScore(
    matchedKeywords: MatchedKeyword[], 
    expectedKeywords: ExpectedKeyword[]
  ): number {
    if (expectedKeywords.length === 0) return 100;

    const totalWeight = expectedKeywords.reduce((sum, kw) => sum + kw.weight, 0);
    const matchedWeight = matchedKeywords.reduce((sum, match) => sum + match.weight, 0);

    return Math.min(100, (matchedWeight / totalWeight) * 100);
  }

  /**
   * Calculate concept coverage score
   */
  private calculateConceptCoverageScore(
    matchedKeywords: MatchedKeyword[], 
    expectedKeywords: ExpectedKeyword[]
  ): number {
    if (expectedKeywords.length === 0) return 100;

    const categories = ['technical', 'concept', 'methodology', 'tool', 'general'];
    const expectedByCategory = new Map<string, number>();
    const matchedByCategory = new Map<string, number>();

    // Count expected keywords by category
    expectedKeywords.forEach(kw => {
      expectedByCategory.set(kw.category, (expectedByCategory.get(kw.category) || 0) + 1);
    });

    // Count matched keywords by category
    matchedKeywords.forEach(match => {
      matchedByCategory.set(match.category, (matchedByCategory.get(match.category) || 0) + 1);
    });

    // Calculate coverage per category
    let totalCoverage = 0;
    let categoriesWithExpectations = 0;

    for (const [category, expectedCount] of expectedByCategory) {
      const matchedCount = matchedByCategory.get(category) || 0;
      const coverage = Math.min(100, (matchedCount / expectedCount) * 100);
      totalCoverage += coverage;
      categoriesWithExpectations++;
    }

    return categoriesWithExpectations > 0 ? totalCoverage / categoriesWithExpectations : 0;
  }

  /**
   * Calculate relevance score based on context
   */
  private calculateRelevanceScore(
    cleanAnswer: string, 
    expectedKeywords: ExpectedKeyword[], 
    questionContext?: string
  ): number {
    let score = 70; // Base relevance score

    // Bonus for answer length (shows elaboration)
    const wordCount = cleanAnswer.split(' ').length;
    if (wordCount >= 50) score += 10;
    else if (wordCount >= 30) score += 5;
    else if (wordCount < 10) score -= 20;

    // Bonus for technical depth (using multiple categories)
    const categories = new Set(expectedKeywords.map(kw => kw.category));
    const usedCategories = new Set();
    
    expectedKeywords.forEach(kw => {
      if (cleanAnswer.includes(kw.primary.toLowerCase())) {
        usedCategories.add(kw.category);
      }
    });

    const categoryBonus = (usedCategories.size / categories.size) * 15;
    score += categoryBonus;

    // Context relevance (if question context is provided)
    if (questionContext) {
      const contextWords = this.extractWords(questionContext.toLowerCase());
      const answerWords = cleanAnswer.split(' ');
      
      const contextOverlap = contextWords.filter(word => 
        answerWords.some(answerWord => answerWord.includes(word) || word.includes(answerWord))
      ).length;
      
      const contextRelevance = Math.min(10, (contextOverlap / contextWords.length) * 10);
      score += contextRelevance;
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Calculate scores by category
   */
  private calculateCategoryScores(
    matchedKeywords: MatchedKeyword[], 
    expectedKeywords: ExpectedKeyword[]
  ): { [key: string]: number } {
    const categories = ['technical', 'concept', 'methodology', 'tool', 'general'];
    const scores: { [key: string]: number } = {};

    categories.forEach(category => {
      const expected = expectedKeywords.filter(kw => kw.category === category);
      const matched = matchedKeywords.filter(m => m.category === category);

      if (expected.length === 0) {
        scores[category] = 100; // Perfect score if no expectations
      } else {
        const expectedWeight = expected.reduce((sum, kw) => sum + kw.weight, 0);
        const matchedWeight = matched.reduce((sum, m) => sum + m.weight, 0);
        scores[category] = Math.min(100, (matchedWeight / expectedWeight) * 100);
      }
    });

    return scores;
  }

  /**
   * Calculate keyword density in the answer
   */
  private calculateKeywordDensity(matchedKeywords: MatchedKeyword[], answerWords: string[]): number {
    if (answerWords.length === 0) return 0;
    
    const technicalWordCount = matchedKeywords.length;
    return (technicalWordCount / answerWords.length) * 100;
  }

  /**
   * Generate expected keywords for common interview questions
   */
  generateExpectedKeywords(questionText: string, position: string): ExpectedKeyword[] {
    const questionLower = questionText.toLowerCase();
    const keywords: ExpectedKeyword[] = [];

    // React/Frontend Developer keywords
    if (position.toLowerCase().includes('frontend') || position.toLowerCase().includes('react')) {
      if (questionLower.includes('react') || questionLower.includes('component') || questionLower.includes('frontend')) {
        keywords.push(
          { primary: 'React', synonyms: ['ReactJS', 'React.js'], weight: 5, category: 'technical' },
          { primary: 'components', synonyms: ['component', 'React components'], weight: 4, category: 'technical' },
          { primary: 'JSX', synonyms: ['JSX syntax'], weight: 3, category: 'technical' },
          { primary: 'hooks', synonyms: ['React hooks', 'useState', 'useEffect'], weight: 4, category: 'technical' },
          { primary: 'state management', synonyms: ['state', 'component state'], weight: 4, category: 'concept' },
          { primary: 'props', synonyms: ['properties', 'component props'], weight: 3, category: 'technical' },
          { primary: 'virtual DOM', synonyms: ['VDOM'], weight: 3, category: 'concept' }
        );
      }
    }

    // Backend Developer keywords
    if (position.toLowerCase().includes('backend') || position.toLowerCase().includes('server')) {
      if (questionLower.includes('api') || questionLower.includes('database') || questionLower.includes('backend')) {
        keywords.push(
          { primary: 'API', synonyms: ['REST API', 'web API', 'application programming interface'], weight: 5, category: 'technical' },
          { primary: 'database', synonyms: ['DB', 'data storage'], weight: 4, category: 'technical' },
          { primary: 'SQL', synonyms: ['structured query language', 'MySQL', 'PostgreSQL'], weight: 4, category: 'technical' },
          { primary: 'server', synonyms: ['web server', 'application server'], weight: 3, category: 'technical' },
          { primary: 'authentication', synonyms: ['auth', 'user authentication'], weight: 3, category: 'concept' },
          { primary: 'security', synonyms: ['data security', 'application security'], weight: 4, category: 'concept' }
        );
      }
    }

    // Data Analyst keywords
    if (position.toLowerCase().includes('data') || position.toLowerCase().includes('analyst')) {
      if (questionLower.includes('data') || questionLower.includes('analysis') || questionLower.includes('sql')) {
        keywords.push(
          { primary: 'data analysis', synonyms: ['analytics', 'data analytics'], weight: 5, category: 'concept' },
          { primary: 'SQL', synonyms: ['structured query language', 'database queries'], weight: 5, category: 'technical' },
          { primary: 'visualization', synonyms: ['data visualization', 'charts', 'graphs'], weight: 4, category: 'methodology' },
          { primary: 'statistics', synonyms: ['statistical analysis', 'stats'], weight: 4, category: 'concept' },
          { primary: 'reporting', synonyms: ['reports', 'data reporting'], weight: 3, category: 'methodology' },
          { primary: 'Excel', synonyms: ['Microsoft Excel', 'spreadsheets'], weight: 3, category: 'tool' }
        );
      }
    }

    // AI/ML Engineer or Data Scientist keywords
    if (position.toLowerCase().includes('ai') || position.toLowerCase().includes('ml') || 
        position.toLowerCase().includes('machine learning') || position.toLowerCase().includes('data scientist') ||
        position.toLowerCase().includes('artificial intelligence') || position.toLowerCase().includes('deep learning')) {
      
      if (questionLower.includes('machine learning') || questionLower.includes('ai') || 
          questionLower.includes('model') || questionLower.includes('algorithm') ||
          questionLower.includes('neural network') || questionLower.includes('data science')) {
        keywords.push(
          { primary: 'machine learning', synonyms: ['ML', 'artificial intelligence', 'AI'], weight: 5, category: 'technical' },
          { primary: 'neural networks', synonyms: ['neural network', 'deep learning', 'DL'], weight: 5, category: 'technical' },
          { primary: 'algorithms', synonyms: ['algorithm', 'ML algorithms', 'learning algorithms'], weight: 4, category: 'technical' },
          { primary: 'model training', synonyms: ['training', 'model development', 'supervised learning'], weight: 4, category: 'concept' },
          { primary: 'feature engineering', synonyms: ['features', 'feature extraction', 'data preprocessing'], weight: 4, category: 'methodology' },
          { primary: 'overfitting', synonyms: ['overfit', 'model overfitting', 'generalization'], weight: 4, category: 'concept' },
          { primary: 'cross validation', synonyms: ['validation', 'model evaluation', 'k-fold'], weight: 3, category: 'methodology' },
          { primary: 'hyperparameters', synonyms: ['hyperparameter tuning', 'model parameters'], weight: 3, category: 'technical' }
        );
      }

      // Deep Learning specific
      if (questionLower.includes('deep learning') || questionLower.includes('neural') || 
          questionLower.includes('cnn') || questionLower.includes('rnn') || questionLower.includes('transformer')) {
        keywords.push(
          { primary: 'convolutional neural network', synonyms: ['CNN', 'ConvNet', 'computer vision'], weight: 5, category: 'technical' },
          { primary: 'recurrent neural network', synonyms: ['RNN', 'LSTM', 'GRU'], weight: 5, category: 'technical' },
          { primary: 'transformer', synonyms: ['attention mechanism', 'self-attention', 'BERT'], weight: 5, category: 'technical' },
          { primary: 'backpropagation', synonyms: ['gradient descent', 'optimization'], weight: 4, category: 'concept' },
          { primary: 'activation functions', synonyms: ['ReLU', 'sigmoid', 'tanh'], weight: 3, category: 'technical' },
          { primary: 'regularization', synonyms: ['dropout', 'batch normalization'], weight: 3, category: 'methodology' }
        );
      }

      // NLP specific
      if (questionLower.includes('nlp') || questionLower.includes('natural language') || 
          questionLower.includes('text') || questionLower.includes('language model')) {
        keywords.push(
          { primary: 'natural language processing', synonyms: ['NLP', 'text processing'], weight: 5, category: 'technical' },
          { primary: 'tokenization', synonyms: ['text tokenization', 'word segmentation'], weight: 4, category: 'methodology' },
          { primary: 'embeddings', synonyms: ['word embeddings', 'vector representations'], weight: 4, category: 'technical' },
          { primary: 'language models', synonyms: ['LLM', 'large language models', 'GPT'], weight: 4, category: 'technical' },
          { primary: 'sentiment analysis', synonyms: ['text classification', 'emotion detection'], weight: 3, category: 'concept' },
          { primary: 'named entity recognition', synonyms: ['NER', 'entity extraction'], weight: 3, category: 'technical' }
        );
      }

      // Computer Vision specific
      if (questionLower.includes('computer vision') || questionLower.includes('image') || 
          questionLower.includes('cv') || questionLower.includes('object detection')) {
        keywords.push(
          { primary: 'computer vision', synonyms: ['CV', 'image processing'], weight: 5, category: 'technical' },
          { primary: 'image classification', synonyms: ['image recognition', 'visual classification'], weight: 4, category: 'concept' },
          { primary: 'object detection', synonyms: ['bounding boxes', 'YOLO', 'R-CNN'], weight: 4, category: 'technical' },
          { primary: 'image segmentation', synonyms: ['semantic segmentation', 'pixel classification'], weight: 4, category: 'technical' },
          { primary: 'convolutional layers', synonyms: ['conv layers', 'feature maps'], weight: 3, category: 'technical' },
          { primary: 'data augmentation', synonyms: ['image augmentation', 'synthetic data'], weight: 3, category: 'methodology' }
        );
      }

      // ML Tools and Frameworks
      if (questionLower.includes('python') || questionLower.includes('tensorflow') || 
          questionLower.includes('pytorch') || questionLower.includes('scikit')) {
        keywords.push(
          { primary: 'TensorFlow', synonyms: ['TF', 'Keras'], weight: 4, category: 'tool' },
          { primary: 'PyTorch', synonyms: ['Torch', 'Facebook PyTorch'], weight: 4, category: 'tool' },
          { primary: 'scikit-learn', synonyms: ['sklearn', 'sci-kit learn'], weight: 4, category: 'tool' },
          { primary: 'pandas', synonyms: ['data manipulation', 'DataFrame'], weight: 3, category: 'tool' },
          { primary: 'NumPy', synonyms: ['numerical computing', 'arrays'], weight: 3, category: 'tool' },
          { primary: 'Jupyter', synonyms: ['Jupyter notebooks', 'interactive computing'], weight: 2, category: 'tool' }
        );
      }
    }

    // Generic programming keywords for challenging project questions
    if (questionLower.includes('project') || questionLower.includes('challenge') || questionLower.includes('problem')) {
      keywords.push(
        { primary: 'problem solving', synonyms: ['troubleshooting', 'debugging'], weight: 4, category: 'concept' },
        { primary: 'algorithm', synonyms: ['algorithms', 'algorithmic approach'], weight: 3, category: 'concept' },
        { primary: 'optimization', synonyms: ['performance optimization', 'efficiency'], weight: 3, category: 'concept' },
        { primary: 'testing', synonyms: ['unit testing', 'automated testing'], weight: 3, category: 'methodology' },
        { primary: 'collaboration', synonyms: ['teamwork', 'team collaboration'], weight: 2, category: 'general' }
      );
    }

    // If no specific keywords found, add some generic ones
    if (keywords.length === 0) {
      keywords.push(
        { primary: 'experience', synonyms: ['background', 'expertise'], weight: 2, category: 'general' },
        { primary: 'skills', synonyms: ['abilities', 'competencies'], weight: 2, category: 'general' },
        { primary: 'development', synonyms: ['programming', 'coding'], weight: 3, category: 'general' },
        { primary: 'technology', synonyms: ['tech', 'technologies'], weight: 2, category: 'general' }
      );
    }

    return keywords;
  }

  /**
   * Get default analysis for empty or invalid input
   */
  private getDefaultAnalysis(): TechnicalAnalysis {
    return {
      overallScore: 0,
      keywordMatchScore: 0,
      conceptCoverageScore: 0,
      relevanceScore: 0,
      breakdown: {
        totalExpectedKeywords: 0,
        matchedKeywords: [],
        missedKeywords: [],
        unexpectedKeywords: [],
        categoryScores: {
          technical: 0,
          concept: 0,
          methodology: 0,
          tool: 0,
          general: 0
        },
        answerlength: 0,
        keywordDensity: 0
      }
    };
  }
}