import { productionPublicOrigin, publicPageMetadata, publicRobotsMetadata } from '../../src/lib/public-metadata';

const production = { NODE_ENV: 'production', VERCEL_ENV: 'production', NEXT_PUBLIC_APP_URL: 'https://experthub.example' };
describe('launch indexing boundary', () => {
  test.each(['preview', 'development'])('%s never uses the configured production canonical', VERCEL_ENV => {
    const env = { ...production, VERCEL_ENV };
    expect(productionPublicOrigin(env)).toBeUndefined();
    expect(publicRobotsMetadata(env)).toEqual({ index: false, follow: false });
    expect(publicPageMetadata('/pricing', 'Pricing', env).alternates).toBeUndefined();
  });
  test.each(['', 'http://experthub.example', 'https://localhost', 'https://local.vercel.app', 'https://qa.invalid', 'https://experthub.example/path', 'https://user:secret@experthub.example', 'https://experthub.example?x=1', 'not-a-url'])('unsafe/missing origin %s remains noindex', NEXT_PUBLIC_APP_URL => {
    const env = { ...production, NEXT_PUBLIC_APP_URL };
    expect(publicRobotsMetadata(env)).toEqual({ index: false, follow: false });
    expect(publicPageMetadata('/', 'Home', env).alternates).toBeUndefined();
  });
  test.each(['/', '/about', '/pricing'] as const)('production canonical is specific to %s', path => {
    const metadata = publicPageMetadata(path, 'ExpertHub', production);
    expect(metadata.alternates?.canonical).toBe('https://experthub.example' + path);
    expect(metadata.robots).toEqual({ index: true, follow: true });
    expect(metadata.description).toContain('AI representations');
  });
  test('self-hosted production requires an origin, local development is noindex', () => {
    expect(productionPublicOrigin({ NODE_ENV: 'production', NEXT_PUBLIC_APP_URL: production.NEXT_PUBLIC_APP_URL })).toBe('https://experthub.example');
    expect(publicRobotsMetadata({ NODE_ENV: 'development', NEXT_PUBLIC_APP_URL: production.NEXT_PUBLIC_APP_URL })).toEqual({ index: false, follow: false });
  });
});
