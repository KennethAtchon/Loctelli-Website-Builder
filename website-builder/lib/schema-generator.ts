import fs from 'fs';
import path from 'path';

interface Field {
  name: string;
  type: string;
  isRequired: boolean;
  isId: boolean;
  isUnique: boolean;
  isRelation: boolean;
  relationType?: 'one-to-many' | 'many-to-one' | 'one-to-one';
  relationTarget?: string;
}

interface Model {
  name: string;
  fields: Field[];
}

export function generateMermaidERD(schemaPath: string = '../project/prisma/schema.prisma'): string {
  try {
    const fullPath = path.resolve(__dirname, schemaPath);
    const schemaContent = fs.readFileSync(fullPath, 'utf-8');
    
    const models = parsePrismaSchema(schemaContent);
    return convertToMermaid(models);
  } catch (error) {
    console.error('Error generating Mermaid ERD:', error);
    return generateFallbackERD();
  }
}

function parsePrismaSchema(content: string): Model[] {
  const models: Model[] = [];
  const modelRegex = /model\s+(\w+)\s*\{([^}]+)\}/g;
  let match;

  while ((match = modelRegex.exec(content)) !== null) {
    const modelName = match[1];
    const modelContent = match[2];
    const fields = parseModelFields(modelContent);
    
    models.push({
      name: modelName,
      fields
    });
  }

  return models;
}

function parseModelFields(modelContent: string): Field[] {
  const fields: Field[] = [];
  const lines = modelContent.split('\n');

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith('//') || trimmedLine.includes('@relation')) {
      continue;
    }

    const fieldMatch = trimmedLine.match(/^(\w+)\s+(\w+(?:\[\])?)\s*(\?)?\s*(.*)$/);
    if (fieldMatch) {
      const [, name, type, optional, attributes] = fieldMatch;
      
      const field: Field = {
        name,
        type: type.replace('[]', ''),
        isRequired: !optional,
        isId: attributes.includes('@id'),
        isUnique: attributes.includes('@unique'),
        isRelation: type.includes('[]') || attributes.includes('@relation'),
        relationType: type.includes('[]') ? 'one-to-many' : 'many-to-one',
        relationTarget: extractRelationTarget(attributes)
      };

      fields.push(field);
    }
  }

  return fields;
}

function extractRelationTarget(attributes: string): string | undefined {
  const relationMatch = attributes.match(/@relation\([^)]*\)/);
  if (relationMatch) {
    // Extract target from relation attributes
    const targetMatch = relationMatch[0].match(/references:\s*\[(\w+)\]/);
    return targetMatch ? targetMatch[1] : undefined;
  }
  return undefined;
}

function convertToMermaid(models: Model[]): string {
  let mermaid = 'erDiagram\n';
  
  // Add entities
  for (const model of models) {
    mermaid += `    ${model.name} {\n`;
    
    for (const field of model.fields) {
      if (!field.isRelation) {
        const type = getMermaidType(field.type);
        const required = field.isRequired ? '' : ' nullable';
        const unique = field.isUnique ? ' unique' : '';
        const id = field.isId ? ' PK' : '';
        
        mermaid += `        ${type}${required}${unique}${id} ${field.name}\n`;
      }
    }
    
    mermaid += '    }\n';
  }

  // Add relationships
  for (const model of models) {
    for (const field of model.fields) {
      if (field.isRelation && field.relationTarget) {
        const relation = getRelationSymbol(field.relationType || 'many-to-one');
        mermaid += `    ${model.name} ${relation} ${field.relationTarget} : "${field.name}"\n`;
      }
    }
  }

  return mermaid;
}

function getMermaidType(prismaType: string): string {
  const typeMap: Record<string, string> = {
    'Int': 'int',
    'String': 'string',
    'Boolean': 'boolean',
    'DateTime': 'datetime',
    'Json': 'json',
    'Float': 'float',
    'Decimal': 'decimal',
    'BigInt': 'bigint',
    'Bytes': 'bytes'
  };
  
  return typeMap[prismaType] || 'string';
}

function getRelationSymbol(relationType: string): string {
  switch (relationType) {
    case 'one-to-many':
      return '||--o{';
    case 'many-to-one':
      return '}o--||';
    case 'one-to-one':
      return '||--||';
    default:
      return '}o--o{';
  }
}

function generateFallbackERD(): string {
  return `erDiagram
    AdminUser {
        int PK id
        string name
        string unique email
        string password
        string role
        boolean isActive
        json nullable permissions
        datetime nullable lastLoginAt
        datetime createdAt
        datetime updatedAt
    }
    
    User {
        int PK id
        string name
        string unique email
        string password
        string role
        boolean isActive
        string nullable company
        string nullable budget
        json nullable bookingsTime
        int bookingEnabled
        string nullable calendarId
        string nullable locationId
        string nullable assignedUserId
        datetime nullable lastLoginAt
        datetime createdAt
        datetime updatedAt
        int nullable createdByAdminId
    }
    
    Strategy {
        int PK id
        int userId
        string name
        string nullable tag
        string nullable tone
        string nullable aiInstructions
        string nullable objectionHandling
        string nullable qualificationPriority
        int nullable creativity
        string nullable aiObjective
        string nullable disqualificationCriteria
        json nullable exampleConversation
        int nullable delayMin
        int nullable delayMax
        datetime createdAt
        datetime updatedAt
    }
    
    Lead {
        int PK id
        int userId
        int strategyId
        string name
        string nullable email
        string nullable phone
        string nullable company
        string nullable position
        string nullable customId
        json nullable messageHistory
        string status
        string nullable notes
        string nullable lastMessage
        string nullable lastMessageDate
    }
    
    Booking {
        int PK id
        int userId
        int nullable leadId
        string bookingType
        json details
        string status
        datetime createdAt
        datetime updatedAt
    }
    
    AdminUser ||--o{ User : "createdUsers"
    User ||--o{ Strategy : "strategies"
    User ||--o{ Lead : "leads"
    User ||--o{ Booking : "bookings"
    Strategy ||--o{ Lead : "leads"
    Lead }o--o{ Booking : "bookings"`;
} 