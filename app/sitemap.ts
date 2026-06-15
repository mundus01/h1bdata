import { MetadataRoute } from 'next';
import { query } from '@/lib/db';

const baseUrl = 'https://h1bdata.us';
const YEARS = [2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [companies, jobs, locations] = await Promise.all([
    query(`SELECT employer_slug FROM company_stats ORDER BY total_filings DESC LIMIT 5000`),
    query(`SELECT job_title_slug FROM job_stats ORDER BY total_filings DESC LIMIT 5000`),
    query(`SELECT worksite_city_slug FROM city_stats ORDER BY total_filings DESC LIMIT 2000`),
  ]);

  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/companies`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/jobs`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/locations`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/salary-calculator`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
  ];

  const hubPages: MetadataRoute.Sitemap = YEARS.flatMap((year) => [
    { url: `${baseUrl}/top-sponsors/${year}`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: `${baseUrl}/top-paying-companies/${year}`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: `${baseUrl}/top-paying-jobs/${year}`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: `${baseUrl}/top-cities/${year}`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.7 },
  ]);

  const companyPages: MetadataRoute.Sitemap = companies.rows.map((c: { employer_slug: string }) => ({
    url: `${baseUrl}/company/${c.employer_slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.9,
  }));

  const jobPages: MetadataRoute.Sitemap = jobs.rows.map((j: { job_title_slug: string }) => ({
    url: `${baseUrl}/job/${j.job_title_slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }));

  const locationPages: MetadataRoute.Sitemap = locations.rows.map((l: { worksite_city_slug: string }) => ({
    url: `${baseUrl}/location/${l.worksite_city_slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  return [...staticPages, ...hubPages, ...companyPages, ...jobPages, ...locationPages];
}
