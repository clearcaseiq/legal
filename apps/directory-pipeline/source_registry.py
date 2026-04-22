"""National source registry for attorney acquisition."""

STATE_BAR_SOURCES = [
    {"source_id": "bar_al_licensing", "name": "Alabama State Bar Lawyer Directory", "jurisdiction_code": "AL", "base_url": "https://www.alabar.org/for-the-public/get-legal-help/", "crawl_method": "directory_listing", "parser_name": "parser_al_bar"},
    {"source_id": "bar_ak_licensing", "name": "Alaska Bar Member Directory", "jurisdiction_code": "AK", "base_url": "https://alaskabar.org/for-the-public/member-directory/", "crawl_method": "directory_listing", "parser_name": "parser_ak_bar"},
    {"source_id": "bar_az_licensing", "name": "State Bar of Arizona Member Directory", "jurisdiction_code": "AZ", "base_url": "https://apps.azbar.org/AZBarGrid/Site/index", "crawl_method": "search_pagination", "parser_name": "parser_az_bar"},
    {"source_id": "bar_ar_licensing", "name": "Arkansas Judiciary Attorney Search", "jurisdiction_code": "AR", "base_url": "https://www.arcourts.gov/administration/professional-programs/attorney-search", "crawl_method": "search_pagination", "parser_name": "parser_ar_bar"},
    {"source_id": "ca_bar_licensing", "name": "California State Bar Licensee Search", "jurisdiction_code": "CA", "base_url": "https://apps.calbar.ca.gov/attorney/LicenseeSearch", "crawl_method": "search_pagination", "parser_name": "parser_ca_bar"},
    {"source_id": "bar_co_licensing", "name": "Colorado Attorney Search", "jurisdiction_code": "CO", "base_url": "https://www.cobar.org/Licensed-Lawyer", "crawl_method": "search_pagination", "parser_name": "parser_co_bar"},
    {"source_id": "bar_ct_licensing", "name": "Connecticut Attorney Search", "jurisdiction_code": "CT", "base_url": "https://www.jud.ct.gov/attorneyfirminquiry/", "crawl_method": "search_pagination", "parser_name": "parser_ct_bar"},
    {"source_id": "bar_de_licensing", "name": "Delaware Lawyer Directory", "jurisdiction_code": "DE", "base_url": "https://courts.delaware.gov/attorneysearch/", "crawl_method": "search_pagination", "parser_name": "parser_de_bar"},
    {"source_id": "bar_dc_licensing", "name": "District of Columbia Bar Member Directory", "jurisdiction_code": "DC", "base_url": "https://members.dcbar.org/eweb/DynamicPage.aspx?Site=DCB&WebCode=FindMember", "crawl_method": "search_pagination", "parser_name": "parser_dc_bar"},
    {"source_id": "bar_fl_licensing", "name": "The Florida Bar Member Search", "jurisdiction_code": "FL", "base_url": "https://www.floridabar.org/directories/find-mbr/", "crawl_method": "search_pagination", "parser_name": "parser_fl_bar"},
    {"source_id": "bar_ga_licensing", "name": "State Bar of Georgia Member Directory", "jurisdiction_code": "GA", "base_url": "https://www.gabar.org/membership/membersearch.cfm", "crawl_method": "search_pagination", "parser_name": "parser_ga_bar"},
    {"source_id": "bar_hi_licensing", "name": "Hawaii State Bar Lawyer Search", "jurisdiction_code": "HI", "base_url": "https://hsba.org/HSBA_2020/Public/Lawyer_Search/Public/Lawyer_Search.aspx", "crawl_method": "search_pagination", "parser_name": "parser_hi_bar"},
    {"source_id": "bar_id_licensing", "name": "Idaho State Bar Member Directory", "jurisdiction_code": "ID", "base_url": "https://isb.idaho.gov/member-roster/", "crawl_method": "directory_listing", "parser_name": "parser_id_bar"},
    {"source_id": "bar_il_licensing", "name": "Illinois ARDC Lawyer Search", "jurisdiction_code": "IL", "base_url": "https://www.iardc.org/Lawyer/Search", "crawl_method": "search_pagination", "parser_name": "parser_il_bar"},
    {"source_id": "bar_in_licensing", "name": "Indiana Roll of Attorneys", "jurisdiction_code": "IN", "base_url": "https://courtapps.in.gov/rollofattorneys", "crawl_method": "search_pagination", "parser_name": "parser_in_bar"},
    {"source_id": "bar_ia_licensing", "name": "Iowa Court Attorney Disciplinary Search", "jurisdiction_code": "IA", "base_url": "https://www.iowacourts.gov/for-the-public/representing-yourself/find-a-lawyer", "crawl_method": "directory_listing", "parser_name": "parser_ia_bar"},
    {"source_id": "bar_ks_licensing", "name": "Kansas Attorney Registration Search", "jurisdiction_code": "KS", "base_url": "https://ksattorneysearch.org/", "crawl_method": "search_pagination", "parser_name": "parser_ks_bar"},
    {"source_id": "bar_ky_licensing", "name": "Kentucky Bar Association Member Directory", "jurisdiction_code": "KY", "base_url": "https://www.kybar.org/search/custom.asp?id=2947", "crawl_method": "search_pagination", "parser_name": "parser_ky_bar"},
    {"source_id": "bar_la_licensing", "name": "Louisiana State Bar Member Directory", "jurisdiction_code": "LA", "base_url": "https://www.lsba.org/Public/MemberDirectory.aspx", "crawl_method": "search_pagination", "parser_name": "parser_la_bar"},
    {"source_id": "bar_me_licensing", "name": "Maine Board of Overseers Attorney Search", "jurisdiction_code": "ME", "base_url": "https://www.boardofbaroverseers.org/", "crawl_method": "directory_listing", "parser_name": "parser_me_bar"},
    {"source_id": "bar_md_licensing", "name": "Maryland Attorney Listing", "jurisdiction_code": "MD", "base_url": "https://www.mdcourts.gov/lawyers/attylist", "crawl_method": "search_pagination", "parser_name": "parser_md_bar"},
    {"source_id": "bar_ma_licensing", "name": "Massachusetts Board of Bar Overseers Lawyer Search", "jurisdiction_code": "MA", "base_url": "https://www.massbbo.org/s/search-lawyer", "crawl_method": "search_pagination", "parser_name": "parser_ma_bar"},
    {"source_id": "bar_mi_licensing", "name": "State Bar of Michigan Member Directory", "jurisdiction_code": "MI", "base_url": "https://www.michbar.org/memberdirectory/home", "crawl_method": "search_pagination", "parser_name": "parser_mi_bar"},
    {"source_id": "bar_mn_licensing", "name": "Minnesota Lawyer Search", "jurisdiction_code": "MN", "base_url": "https://lprb.mncourts.gov/LawyerSearch/Pages/default.aspx", "crawl_method": "search_pagination", "parser_name": "parser_mn_bar"},
    {"source_id": "bar_ms_licensing", "name": "Mississippi Bar Attorney Directory", "jurisdiction_code": "MS", "base_url": "https://www.msbar.org/for-the-public/find-a-lawyer/", "crawl_method": "directory_listing", "parser_name": "parser_ms_bar"},
    {"source_id": "bar_mo_licensing", "name": "Missouri Bar Lawyer Search", "jurisdiction_code": "MO", "base_url": "https://mobar.org/site/content/For-the-Public/Lawyer_Directory.aspx", "crawl_method": "search_pagination", "parser_name": "parser_mo_bar"},
    {"source_id": "bar_mt_licensing", "name": "Montana State Bar Member Search", "jurisdiction_code": "MT", "base_url": "https://www.montanabar.org/page/MemberDirectory", "crawl_method": "search_pagination", "parser_name": "parser_mt_bar"},
    {"source_id": "bar_ne_licensing", "name": "Nebraska State Bar Lawyer Referral Search", "jurisdiction_code": "NE", "base_url": "https://www.nefindalawyer.com/", "crawl_method": "search_pagination", "parser_name": "parser_ne_bar"},
    {"source_id": "bar_nv_licensing", "name": "State Bar of Nevada Lawyer Search", "jurisdiction_code": "NV", "base_url": "https://nvbar.org/for-the-public/find-a-lawyer/lrs/", "crawl_method": "search_pagination", "parser_name": "parser_nv_bar"},
    {"source_id": "bar_nh_licensing", "name": "New Hampshire Bar Member Directory", "jurisdiction_code": "NH", "base_url": "https://www.nhbar.org/member-directory", "crawl_method": "directory_listing", "parser_name": "parser_nh_bar"},
    {"source_id": "bar_nj_licensing", "name": "New Jersey Attorney Index", "jurisdiction_code": "NJ", "base_url": "https://portal.njcourts.gov/webe5/AttorneyWeb/pages/publicAttorneySearch.faces", "crawl_method": "search_pagination", "parser_name": "parser_nj_bar"},
    {"source_id": "bar_nm_licensing", "name": "New Mexico State Bar Directory", "jurisdiction_code": "NM", "base_url": "https://www.sbnm.org/Directory", "crawl_method": "directory_listing", "parser_name": "parser_nm_bar"},
    {"source_id": "bar_ny_licensing", "name": "New York Attorney Search", "jurisdiction_code": "NY", "base_url": "https://iapps.courts.state.ny.us/attorneyservices/search", "crawl_method": "search_pagination", "parser_name": "parser_ny_bar"},
    {"source_id": "bar_nc_licensing", "name": "North Carolina State Bar Lawyer Directory", "jurisdiction_code": "NC", "base_url": "https://www.ncbar.gov/for-the-public/finding-a-lawyer/", "crawl_method": "search_pagination", "parser_name": "parser_nc_bar"},
    {"source_id": "bar_nd_licensing", "name": "North Dakota Attorney Search", "jurisdiction_code": "ND", "base_url": "https://attorneys.ndcourts.gov/", "crawl_method": "search_pagination", "parser_name": "parser_nd_bar"},
    {"source_id": "bar_oh_licensing", "name": "Ohio Attorney Directory Search", "jurisdiction_code": "OH", "base_url": "https://www.supremecourt.ohio.gov/attorneysearch/", "crawl_method": "search_pagination", "parser_name": "parser_oh_bar"},
    {"source_id": "bar_ok_licensing", "name": "Oklahoma Bar Association Member Search", "jurisdiction_code": "OK", "base_url": "https://www.okbar.org/membersearch/", "crawl_method": "search_pagination", "parser_name": "parser_ok_bar"},
    {"source_id": "bar_or_licensing", "name": "Oregon State Bar Member Directory", "jurisdiction_code": "OR", "base_url": "https://www.osbar.org/members/membersearch_display.asp", "crawl_method": "search_pagination", "parser_name": "parser_or_bar"},
    {"source_id": "bar_pa_licensing", "name": "Pennsylvania Disciplinary Board Lawyer Search", "jurisdiction_code": "PA", "base_url": "https://www.padisciplinaryboard.org/for-the-public/find-attorney", "crawl_method": "search_pagination", "parser_name": "parser_pa_bar"},
    {"source_id": "bar_ri_licensing", "name": "Rhode Island Bar Member Search", "jurisdiction_code": "RI", "base_url": "https://ribar.com/For-the-Public/Find-a-Lawyer", "crawl_method": "directory_listing", "parser_name": "parser_ri_bar"},
    {"source_id": "bar_sc_licensing", "name": "South Carolina Lawyer Search", "jurisdiction_code": "SC", "base_url": "https://www.scbar.org/public/get-legal-help/find-lawyer-or-mediator/find-a-lawyer/", "crawl_method": "search_pagination", "parser_name": "parser_sc_bar"},
    {"source_id": "bar_sd_licensing", "name": "South Dakota Bar Find a Lawyer", "jurisdiction_code": "SD", "base_url": "https://www.statebarofsouthdakota.com/find-a-lawyer", "crawl_method": "directory_listing", "parser_name": "parser_sd_bar"},
    {"source_id": "bar_tn_licensing", "name": "Tennessee BPR Attorney Search", "jurisdiction_code": "TN", "base_url": "https://www.tbpr.org/attorney-search", "crawl_method": "search_pagination", "parser_name": "parser_tn_bar"},
    {"source_id": "bar_tx_licensing", "name": "State Bar of Texas Find A Lawyer", "jurisdiction_code": "TX", "base_url": "https://www.texasbar.com/AM/Template.cfm?Section=Find_A_Lawyer", "crawl_method": "search_pagination", "parser_name": "parser_tx_bar"},
    {"source_id": "bar_ut_licensing", "name": "Utah State Bar Lawyer Directory", "jurisdiction_code": "UT", "base_url": "https://services.utahbar.org/Member-Directory", "crawl_method": "search_pagination", "parser_name": "parser_ut_bar"},
    {"source_id": "bar_vt_licensing", "name": "Vermont Attorney Licensing Search", "jurisdiction_code": "VT", "base_url": "https://www.vermontjudiciary.org/attorneys", "crawl_method": "directory_listing", "parser_name": "parser_vt_bar"},
    {"source_id": "bar_va_licensing", "name": "Virginia State Bar Member Search", "jurisdiction_code": "VA", "base_url": "https://members.vsb.org/directory/search", "crawl_method": "search_pagination", "parser_name": "parser_va_bar"},
    {"source_id": "bar_wa_licensing", "name": "Washington State Bar Legal Directory", "jurisdiction_code": "WA", "base_url": "https://www.mywsba.org/PersonifyEbusiness/LegalDirectory.aspx", "crawl_method": "search_pagination", "parser_name": "parser_wa_bar"},
    {"source_id": "bar_wv_licensing", "name": "West Virginia State Bar Lawyer Search", "jurisdiction_code": "WV", "base_url": "https://wvbar.org/for-the-public/find-a-lawyer/", "crawl_method": "directory_listing", "parser_name": "parser_wv_bar"},
    {"source_id": "bar_wi_licensing", "name": "State Bar of Wisconsin Lawyer Search", "jurisdiction_code": "WI", "base_url": "https://www.wisbar.org/forPublic/INeedaLawyer/Pages/LRIS.aspx", "crawl_method": "search_pagination", "parser_name": "parser_wi_bar"},
    {"source_id": "bar_wy_licensing", "name": "Wyoming State Bar Member Directory", "jurisdiction_code": "WY", "base_url": "https://www.wyomingbar.org/for-the-public/hire-a-lawyer/", "crawl_method": "directory_listing", "parser_name": "parser_wy_bar"},
]

DIRECTORY_ENRICHMENT_SOURCES = [
    {"source_id": "dir_martindale", "name": "Martindale-Hubbell Lawyer Directory", "source_type": "directory", "source_family": "directory", "coverage_scope": "national", "jurisdiction_code": "US", "priority_tier": 2, "base_url": "https://www.martindale.com/", "crawl_method": "search_pagination", "parser_name": "parser_martindale"},
    {"source_id": "dir_justia", "name": "Justia Lawyer Directory", "source_type": "directory", "source_family": "directory", "coverage_scope": "national", "jurisdiction_code": "US", "priority_tier": 2, "base_url": "https://lawyers.justia.com/", "crawl_method": "search_pagination", "parser_name": "parser_justia"},
    {"source_id": "dir_avvo", "name": "Avvo Lawyer Directory", "source_type": "directory", "source_family": "directory", "coverage_scope": "national", "jurisdiction_code": "US", "priority_tier": 2, "base_url": "https://www.avvo.com/", "crawl_method": "search_pagination", "parser_name": "parser_avvo"},
    {"source_id": "dir_findlaw", "name": "FindLaw Lawyer Directory", "source_type": "directory", "source_family": "directory", "coverage_scope": "national", "jurisdiction_code": "US", "priority_tier": 2, "base_url": "https://lawyers.findlaw.com/", "crawl_method": "search_pagination", "parser_name": "parser_findlaw"},
]

LICENSED_IMPORT_SOURCES = [
    {
        "source_id": "bar_ny_licensed_import",
        "name": "New York Attorney Registry Licensed Import",
        "source_type": "licensing",
        "source_family": "licensed_import",
        "coverage_scope": "state",
        "jurisdiction_code": "NY",
        "priority_tier": 1,
        "base_url": None,
        "crawl_method": "file_import",
        "parser_name": "parser_ny_licensed_import",
    },
]

FIRM_WEBSITE_SOURCES = [
    {"source_id": "firm_website_public", "name": "Public Firm Website Resolver", "source_type": "firm_website", "source_family": "firm_website", "coverage_scope": "national", "jurisdiction_code": "US", "priority_tier": 2, "base_url": None, "crawl_method": "profile_page", "parser_name": "parser_firm_website"},
]

SPECIALIZATION_SOURCES = [
    {"source_id": "spec_ca_legal_specialization", "name": "California Legal Specialization", "source_type": "specialization_board", "source_family": "specialization_board", "coverage_scope": "state", "jurisdiction_code": "CA", "priority_tier": 1, "base_url": "https://www.calbar.ca.gov/Attorneys/Legal-Specialization", "crawl_method": "directory_listing", "parser_name": "parser_ca_specialization"},
    {"source_id": "spec_fl_board_certification", "name": "Florida Bar Board Certification", "source_type": "specialization_board", "source_family": "specialization_board", "coverage_scope": "state", "jurisdiction_code": "FL", "priority_tier": 1, "base_url": "https://www.floridabar.org/about/cert/", "crawl_method": "directory_listing", "parser_name": "parser_fl_specialization"},
    {"source_id": "spec_tx_board_specialization", "name": "Texas Board of Legal Specialization", "source_type": "specialization_board", "source_family": "specialization_board", "coverage_scope": "state", "jurisdiction_code": "TX", "priority_tier": 1, "base_url": "https://www.tbls.org/", "crawl_method": "directory_listing", "parser_name": "parser_tx_specialization"},
]


def all_sources():
    normalized = []

    for source in STATE_BAR_SOURCES:
        normalized.append(
            {
                "source_type": "licensing",
                "source_family": "state_bar",
                "coverage_scope": "state",
                "priority_tier": 1,
                "refresh_frequency_days": 30,
                "rate_limit_rpm": 20,
                "robots_respected": True,
                **source,
            }
        )

    for collection in [DIRECTORY_ENRICHMENT_SOURCES, LICENSED_IMPORT_SOURCES, FIRM_WEBSITE_SOURCES, SPECIALIZATION_SOURCES]:
        for source in collection:
            normalized.append(
                {
                    "refresh_frequency_days": 30,
                    "rate_limit_rpm": 30,
                    "robots_respected": True,
                    **source,
                }
            )

    return normalized
