import {
  getAdminClient,
  handleOptions,
  json,
  readJson,
  requirePost,
  validateTileKey,
} from '../_shared/utils.ts';
import {
  assertPrivatePagesEnabled,
  getSecretEntriesForViewer,
  getSecretPageContent,
  getSecretTallyCounts,
  requireSecretPageView,
} from '../_shared/secret-page.ts';

type Payload = {
  tile_key?: string;
};

Deno.serve(async (req) => {
  const optionsResponse = handleOptions(req);
  if (optionsResponse) return optionsResponse;

  const methodResponse = requirePost(req);
  if (methodResponse) return methodResponse;

  try {
    assertPrivatePagesEnabled();

    const client = getAdminClient();
    const body = await readJson<Payload>(req);
    const visitor = await validateTileKey(client, body.tile_key ?? '');
    const access = await requireSecretPageView(client, visitor);
    const pageContent = await getSecretPageContent(client);

    return json({
      ok: true,
      viewer: {
        user_slug: visitor.user_slug,
        display_name: visitor.display_name,
        accent_color: visitor.accent_color,
        can_edit_secret_page: access.can_edit_fixed_content,
        can_edit_fixed_content: access.can_edit_fixed_content,
        allowed_entry_sections: access.allowed_entry_sections,
      },
      secret: {
        unlocked_at: access.secret_unlocked_at,
        can_view: access.can_view_secret_page,
        can_edit_fixed_content: access.can_edit_fixed_content,
        allowed_entry_sections: access.allowed_entry_sections,
      },
      page: {
        secret_unlocked_at: access.secret_unlocked_at,
        content_updated_at: pageContent.updated_at,
      },
      content: pageContent.content,
      entries: await getSecretEntriesForViewer(client, visitor),
      tally: await getSecretTallyCounts(client),
    }, 200, { req });
  } catch (error) {
    return json({
      ok: false,
      error: error instanceof Error ? error.message : 'Unable to read this page.',
    }, 400, { req });
  }
});
