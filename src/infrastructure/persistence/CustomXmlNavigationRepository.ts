import {
  customXmlPartNamespace,
  customXmlPartRootTag,
} from '../../domain/navigation/constants';
import type { PersistedNavigationModel } from '../../domain/navigation/types';

function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function unescapeXml(value: string) {
  return value
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&');
}

function serializeModel(model: PersistedNavigationModel) {
  const json = escapeXml(JSON.stringify(model));
  return `<${customXmlPartRootTag} xmlns="${customXmlPartNamespace}">${json}</${customXmlPartRootTag}>`;
}

function deserializeModel(xml: string): PersistedNavigationModel | null {
  const pattern = new RegExp(`<${customXmlPartRootTag}[^>]*>([\\s\\S]*)<\\/${customXmlPartRootTag}>`);
  const match = xml.match(pattern);
  if (!match?.[1]) {
    return null;
  }

  try {
    const candidate = JSON.parse(unescapeXml(match[1])) as PersistedNavigationModel;
    return candidate?.schemaVersion === 2 ? candidate : null;
  } catch {
    return null;
  }
}

export class CustomXmlNavigationRepository {
  async load(): Promise<PersistedNavigationModel | null> {
    if (typeof Excel === 'undefined') {
      return null;
    }

    return Excel.run(async (context) => {
      const collection = context.workbook.customXmlParts.getByNamespace(customXmlPartNamespace);
      collection.load('items/id');
      await context.sync();

      if (!collection.items.length) {
        return null;
      }

      const [primaryPart] = collection.items;
      const xml = primaryPart.getXml();

      for (const duplicatePart of collection.items.slice(1)) {
        duplicatePart.delete();
      }

      await context.sync();
      const model = deserializeModel(xml.value);
      if (!model) {
        throw new Error('Custom XML payload is invalid.');
      }

      return model;
    });
  }

  async save(model: PersistedNavigationModel) {
    if (typeof Excel === 'undefined') {
      throw new Error('Excel runtime is unavailable.');
    }

    const serializedModel = serializeModel(model);

    await Excel.run(async (context) => {
      const collection = context.workbook.customXmlParts.getByNamespace(customXmlPartNamespace);
      collection.load('items/id');
      await context.sync();

      if (!collection.items.length) {
        context.workbook.customXmlParts.add(serializedModel);
        await context.sync();
        return;
      }

      const [primaryPart] = collection.items;
      primaryPart.setXml(serializedModel);

      for (const duplicatePart of collection.items.slice(1)) {
        duplicatePart.delete();
      }

      await context.sync();
    });
  }
}
