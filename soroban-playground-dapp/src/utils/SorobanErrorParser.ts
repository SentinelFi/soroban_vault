export enum SorobanErrorType {
    CONTRACT_ERROR = 'ContractError',
    HOST_ERROR = 'HostError',
    NETWORK_ERROR = 'NetworkError',
    UNKNOWN_ERROR = 'UnknownError'
  }
  
export interface ParsedSorobanError {
    type: SorobanErrorType;
    code?: number;
    message: string;
    contractId?: string;
    functionName?: string;
    rawError?: string;
}

export class SorobanErrorParser {
    private static parseContractId(error: string): string | undefined {
      const contractMatch = error.match(/contract:([\w\d]+)/);
      return contractMatch ? contractMatch[1] : undefined;
    }
  
    private static parseFunctionName(error: string): string | undefined {
      const fnMatch = error.match(/fn_call,\s+[\w\d]+,\s+([^\s,\]]+)/);
      return fnMatch ? fnMatch[1] : undefined;
    }
  
    private static parseErrorCode(error: string): number | undefined {
      const codeMatch = error.match(/Error\(Contract,\s*#(\d+)\)/);
      return codeMatch ? parseInt(codeMatch[1]) : undefined;
    }
  
    public static parse(error: any, errorRecords: Record<number, string>): ParsedSorobanError {
      const errorString = error?.toString() || '';
  
      if (errorString.includes('HostError')) {
        const contractId = this.parseContractId(errorString);
        const functionName = this.parseFunctionName(errorString);
        const errorCode = this.parseErrorCode(errorString);
        return {
          type: SorobanErrorType.HOST_ERROR,
          code: errorCode,
          message: this.getErrorMessage(errorRecords, errorCode),
          contractId,
          functionName,
          rawError: errorString
        };
      }
  
      if (error?.message?.includes('Failed to fetch') || error?.name === 'NetworkError') {
        return {
          type: SorobanErrorType.NETWORK_ERROR,
          message: 'Network connection failed'
        };
      }
  
      return {
        type: SorobanErrorType.UNKNOWN_ERROR,
        message: 'An unexpected error occurred',
        rawError: errorString
      };
    }
  
    private static getErrorMessage(errorRecords: Record<number, string>, code?: number): string {
      if (!code) return 'Unknown contract error';
      //   const example: Record<number, string> = {
      //     1: 'Invalid input parameters',
      //     2: 'Metadata not found',
      //     3: 'Unauthorized access',
      //     // More error codes as needed
      //   };
      return errorRecords[code] || `Contract error: ${code}`;
    }
}