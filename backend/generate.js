// generate.js
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const subDir = args[0] && !args[0].includes('.') ? args[0] : null;
const moduleName = subDir ? args[1] : args[0];

if (!moduleName) {
    console.error('❌ Error: Debes proporcionar el nombre de módulo (y opcionalmente el subdirectorio)');
    console.log('📖 Uso: node generate.js [subdirectorio] <nombre-modulo>');
    process.exit(1);
}

const pascalCase = moduleName.charAt(0).toUpperCase() + moduleName.slice(1);
const camelCase = moduleName.charAt(0).toLowerCase() + moduleName.slice(1);
const kebabCase = moduleName.toLowerCase();

const controllersDir = subDir ? `./src/controllers/${subDir}` : './src/controllers';
const routesDir = subDir ? `./src/routes/${subDir}` : './src/routes';
const servicesDir = subDir ? `./src/services/${subDir}` : './src/services';
const entityDir = subDir ? `./src/entities/${subDir}` : './src/entities';

[controllersDir, routesDir, servicesDir, entityDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

const basePath = subDir ? '../' : './';

const controllerTemplate = `import { Request, Response } from 'express';
import { GenResponse } from '${basePath}genResponse';
import { ${pascalCase}Service } from '${basePath}../services/${subDir ? subDir + '/' : ''}${camelCase}.service';

export class ${pascalCase}Controller {
}
`;

const serviceTemplate = `import { DB } from '${basePath}../config/typeorm';
import { ${pascalCase} } from '${basePath}../entities/${subDir ? subDir + '/' : ''}${camelCase}.entity';

export class ${pascalCase}Service {
}
`;

const routesTemplate = `import { Router } from 'express';
import { ${pascalCase}Controller } from '${basePath}../controllers/${subDir ? subDir + '/' : ''}${camelCase}.controller';

const router = Router();

export default router;
`;

const entityTemplate = `import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: "${kebabCase}" })
export class ${pascalCase} {
    @PrimaryGeneratedColumn({ name: "id" })
    id!: number;

}
`;

try {
    fs.writeFileSync(path.join(controllersDir, `${camelCase}.controller.ts`), controllerTemplate);
    fs.writeFileSync(path.join(servicesDir, `${camelCase}.service.ts`), serviceTemplate);
    fs.writeFileSync(path.join(routesDir, `${camelCase}.routes.ts`), routesTemplate);
    fs.writeFileSync(path.join(entityDir, `${camelCase}.entity.ts`), entityTemplate);

    console.log(`Archivos generados para módulo '${moduleName}'${subDir ? ` en subdirectorio '${subDir}'` : ''}:`);
    console.log(`${controllersDir}/${camelCase}.controller.ts`);
    console.log(`${servicesDir}/${camelCase}.service.ts`);
    console.log(`${routesDir}/${camelCase}.routes.ts`);
    console.log(`${entityDir}/${camelCase}.entity.ts`);
} catch (error) {
    console.error('Error:', error);
}
