/**
 * Enhanced error handling utilities for DITy
 */

export class DependencyError extends Error {
    constructor(
        message: string,
        public readonly dependencyKey: string,
        public readonly moduleName?: string,
        public readonly resolutionPath?: string[]
    ) {
        super(message)
        this.name = 'DependencyError'
    }
}

export class ModuleError extends Error {
    constructor(
        message: string,
        public readonly moduleName: string,
        public readonly parentModule?: string
    ) {
        super(message)
        this.name = 'ModuleError'
    }
}

export class CircularDependencyError extends Error {
    constructor(
        public readonly dependencyChain: string[]
    ) {
        super(`Circular dependency detected: ${dependencyChain.join(' -> ')}`)
        this.name = 'CircularDependencyError'
    }
}

/**
 * Create enhanced error message with suggestions
 */
export function createDependencyNotFoundError(
    key: string,
    moduleName: string,
    availableDependencies: string[],
    resolutionPath: string[] = []
): DependencyError {
    let message = `Dependency '${key}' not found in module '${moduleName}'`
    
    if (resolutionPath.length > 0) {
        message += `\n  Resolution path: ${resolutionPath.join(' -> ')}`
    }
    
    // Suggest similar dependency names
    const suggestions = findSimilarKeys(key, availableDependencies)
    if (suggestions.length > 0) {
        message += `\n  Did you mean: ${suggestions.join(', ')}?`
    }
    
    if (availableDependencies.length > 0) {
        message += `\n  Available dependencies: ${availableDependencies.slice(0, 10).join(', ')}`
        if (availableDependencies.length > 10) {
            message += ` (and ${availableDependencies.length - 10} more)`
        }
    }
    
    return new DependencyError(message, key, moduleName, resolutionPath)
}

/**
 * Create enhanced module not found error
 */
export function createModuleNotFoundError(
    moduleName: string,
    parentModule: string,
    availableModules: string[]
): ModuleError {
    let message = `Module '${moduleName}' not found in module '${parentModule}'`
    
    const suggestions = findSimilarKeys(moduleName, availableModules)
    if (suggestions.length > 0) {
        message += `\n  Did you mean: ${suggestions.join(', ')}?`
    }
    
    if (availableModules.length > 0) {
        message += `\n  Available modules: ${availableModules.join(', ')}`
    }
    
    return new ModuleError(message, moduleName, parentModule)
}

/**
 * Find keys similar to the target using Levenshtein distance
 */
function findSimilarKeys(target: string, candidates: string[], maxDistance: number = 2): string[] {
    return candidates
        .map(candidate => ({
            candidate,
            distance: levenshteinDistance(target.toLowerCase(), candidate.toLowerCase())
        }))
        .filter(({ distance }) => distance <= maxDistance && distance > 0)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 3)
        .map(({ candidate }) => candidate)
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
    if (str1.length === 0) return str2.length
    if (str2.length === 0) return str1.length
    
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null))
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j
    
    for (let j = 1; j <= str2.length; j++) {
        for (let i = 1; i <= str1.length; i++) {
            const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1
            matrix[j][i] = Math.min(
                matrix[j][i - 1] + 1,     // deletion
                matrix[j - 1][i] + 1,     // insertion
                matrix[j - 1][i - 1] + indicator // substitution
            )
        }
    }
    
    return matrix[str2.length][str1.length]
}