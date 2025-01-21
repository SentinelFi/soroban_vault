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
    diagnosticError?: string;
    rawError?: string;
}

export type DiagnosticEvent = {
    contract?: string;
    topics: string[];
    data: string | string[];
};

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
          diagnosticError: this.getDiagnosticError(errorString),
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
    

    private static getDiagnosticError = (errorString: string) : string => {
        const diagnostics = this.parseHostErrorEvents(errorString);
        if (diagnostics.length > 0) 
        {
            const panicEvent = diagnostics.find(event => event.topics?.includes('error'));
            if (panicEvent) 
            {
                if (!panicEvent.data) return "";
                const returnValue = typeof panicEvent.data === "string" ? panicEvent.data : panicEvent.data.join(";");
                return returnValue;
            }
        }
        return "";
    }

    private static parseHostErrorEvents = (errorString: string): DiagnosticEvent[] => {
        try {
          const lines = errorString.split('\n');

          const eventLogIndex = lines.findIndex(line => line.includes('Event log'));
          if (eventLogIndex === -1) return [];
      
          const events: DiagnosticEvent[] = [];
          let currentEvent: Partial<DiagnosticEvent> = {};
      
          for (let i = eventLogIndex + 1; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (!line) continue;
            
            if (line.match(/^\d+:/)) {
              if (Object.keys(currentEvent).length > 0) {
                events.push(currentEvent as DiagnosticEvent);
                currentEvent = {};
              }
              
              const eventMatch = line.match(/\[Diagnostic Event\] (.*)/);
              if (eventMatch) {
                const eventData = eventMatch[1];
                
                const contractMatch = eventData.match(/contract:([\w\d]+),?/);
                if (contractMatch) {
                  currentEvent.contract = contractMatch[1];
                }
                
                const topicsMatch = eventData.match(/topics:\[(.*?)\]/);
                if (topicsMatch) {
                  currentEvent.topics = topicsMatch[1].split(',').map(t => t.trim());
                }
                
                const dataMatch = eventData.match(/data:(.+)$/);
                if (dataMatch) {
                  try {
                    const dataStr = dataMatch[1].trim();
                    if (dataStr.startsWith('[') && dataStr.endsWith(']')) {
                      currentEvent.data = JSON.parse(dataStr);
                    } else {
                      currentEvent.data = dataStr;
                    }
                  } catch {
                    currentEvent.data = dataMatch[1].trim();
                  }
                }
              }
            }
          }
          
          if (Object.keys(currentEvent).length > 0) {
            events.push(currentEvent as DiagnosticEvent);
          }
          
          return events;
        } catch (error) {
          console.error('Error parsing host events:', error);
          return [];
        }
      };
  
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