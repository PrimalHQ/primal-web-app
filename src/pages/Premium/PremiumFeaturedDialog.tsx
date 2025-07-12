import { Tabs } from '@kobalte/core/tabs';
import { Component, createEffect, createSignal, For, Match, onCleanup, onMount, Show, Switch } from 'solid-js';
import AdvancedSearchDialog from '../../components/AdvancedSearch/AdvancedSearchDialog';
import ButtonSecondary from '../../components/Buttons/ButtonSecondary';
import HelpTip from '../../components/HelpTip/HelpTip';

import styles from './Premium.module.scss';
import { A, useNavigate } from '@solidjs/router';
import ButtonLink from '../../components/Buttons/ButtonLink';

export type FetureComparison = {
  name: string,
  free: string,
  premium: string,
  help?: string,
}

const premiumFeatures = [
  {
    name: 'Web, iOS, Android applikáció',
    free: 'true',
    premium: 'true',
  },
  {
    name: 'Beépített Bitcoin Lightning tárca',
    free: 'true',
    premium: 'true',
  },
  {
    name: 'Globális Noszter szöveg- és felhasználókereső',
    free: 'true',
    premium: 'true',
  },
  {
    name: 'Média tárhely kapacitás',
    free: '1 GB',
    premium: '10 GB',
  },
  {
    name: 'Maximum média fájl méret',
    free: '100 mb',
    premium: '1 GB',
  },
  {
    name: 'Ellenőrzött Noszter Cím',
    free: 'false',
    premium: 'true',
    help: 'Pl.: alice@primal.net',
  },
  {
    name: 'Egyedi Lightning Cím',
    free: 'false',
    premium: 'true',
    help: 'Pl.: alice@primal.net',
  },
  {
    name: 'VIP Profil a primal.net-en',
    free: 'false',
    premium: 'true',
    help: 'Pl.: primal.net/alice',
  },
  {
    name: 'Összetett Noszter keresés',
    free: 'false',
    premium: 'true',
    help: 'Találj meg bármit a Noszteren! Keresés kulcsszavak és kifejezések, tartalomtípus, ki posztolta, ki válaszolt, ki zappel, közzététel ideje, hálózati lefedettség és egy csomó szűrő alapján.',
  },
  {
    name: 'Prémium fizetős relé',
    free: 'false',
    premium: 'true',
    help: 'wss://premium.primal.net',
  },
  {
    name: 'Kapcsolati Lista Biztonsági Mentése',
    free: 'false',
    premium: 'true',
    help: 'A Primal biztonsági mentést készít a Noszter követési listád 100+ legutóbbi verziójáról. Ha a követési listád törlődik vagy megsérül egy másik Noszter alkalmazás miatt, a Primal Prémium felhasználók a Noszter Eszközök szekcióban található Kapcsolati Lista Biztonsági Mentése eszközzel visszaállíthatják azt.',
  },
  {
    name: 'Tartalom Biztonsági Mentése',
    free: 'false',
    premium: 'true',
    help: 'A Primal archiválja az összes Noszter tartalmad teljes előzményeit. A Primal Prémium felhasználók a Noszter Eszközök szekcióban található Tartalom Biztonsági Mentése eszközzel bármikor újraküldhetik tartalmaik tetszőleges részhalmazát a kiválasztott relékre.',
  },
  // {
  //   name: 'Premium feeds',
  //   free: 'false',
  //   premium: 'true',
  //   help: 'Some advanced feeds will be accessible only to Primal Premium users. You will be able to access these feeds through other Nostr clients that support DVM feeds.',
  // },
  // {
  //   name: 'Private beta access',
  //   free: 'false',
  //   premium: 'true',
  //   help: 'Get early exclusive access to Primal Beta releases.',
  // },
  {
    name: 'És még sok minden várható!',
    free: 'false',
    premium: 'true',
    help: 'Rengeteg új és izgalmas funkción dolgozunk a Primal Prémium számára. Ahogy közeledünk a megjelenésükhöz, be fogjuk jelenteni őket. Addig is bátran vedd fel velünk a kapcsolatot, és oszd meg velünk, milyen funkciókat látnál szívesen a Primal Prémiumban. Minden javaslatot szívesen fogadunk!',
  },
]

const faq = [
  {
    question: 'Hogyan kaphatok segítséget?',
    answer: 'Egyszerűen küldj egy emailt nekünk a support@primal.net címre, és tüntesd fel a Primal Nevedet az üzenetben. A prémium felhasználók támogatási kérelmei prioritást élveznek, és általában ugyanazon a munkanapon kezeljük őket.',
  },
  {
    question: 'Módosíthatom a Primal Nevemet?',
    answer: 'Igen! Ha szeretnéd megváltoztatni a Primal Nevedet, egyszerűen használd a „Primal Név Megváltoztatása” opciót a Prémium szekcióban bármelyik Primal alkalmazásban. Az új neved azonnal működni fog, és a régi neved felszabadul, így más felhasználók regisztrálhatják.',
  },
  {
    question: 'Használnom kell a Primal ellenőrzött nevemet és lightning címet?',
    answer: 'Nem. Primal Prémium felhasználóként lehetőséged van Primal Nevet fenntartani, de nem kötelező azt használnod a Noszter ellenőrzött címedként (NIP-05), sem pedig a bitcoin lightning címedként. Egyszerűen beállíthatod a kívánt Noszter ellenőrzött címet és/vagy bitcoin lightning címet a Noszter profilbeállításaidban.',
  },
  {
    question: 'Örökre az enyém marad a Primal Nevem?',
    answer: 'Jogod van használni a Primal Nevedet a Primal Prémium előfizetésed időtartama alatt. Miután az előfizetésed lejár, 30 napos türelmi időszak van, amely alatt a Primal Neved nem lesz elérhető mások számára. A Primal Legenda felhasználóknak nem lejáró előfizetésük van, így ők korlátlan ideig használhatják a Primal Nevüket. Kérjük, vedd figyelembe, hogy minden Primal Név a Primal tulajdona, amit a felhasználóknak bérbe adunk. A Primal fenntartja a jogot, hogy visszavonja bármely nevet, ha megállapítja, hogy az védett márkanevű, lehetséges álnéven való használatra vagy bármilyen más visszaélésre van példa, ahogyan azt a Primal meghatározza. További részletekért kérjük, olvasd el a <a data-link="terms">Felhasználási feltételeinket</a>.',
  },
  {
    question: 'Vásárolhatok több Primal Nevet?',
    answer: 'Dolgozunk azon, hogy lehetővé tegyük több Primal Név kezelését. Addig is bátran vedd fel velünk a kapcsolatot a support@primal.net címen, és megpróbálunk segíteni.',
  },
  {
    question: 'Kapcsolódik a fizetési információm a Noszter fiókomhoz?',
    answer: 'Nem. A Primal Prémium vásárolható iOS App Store in-app vásárlással, Google Play in-app vásárlással, vagy közvetlenül bitcoin lightning segítségével a Primal webalkalmazáson keresztül. Bármelyik fizetési módot választod, a fizetési információid nem kapcsolódnak a Noszter fiókodhoz.',
  },
  {
    question: 'Hosszabbíthatom az előfizetésemet? Hogyan működik ez?',
    answer: 'Igen, meghosszabbíthatod az előfizetésedet bármelyik általunk támogatott fizetési módon: iOS App Store in-app vásárlás, Google Play in-app vásárlás, vagy közvetlenül bitcoin lightning segítségével a Primal webalkalmazáson. Bármelyik vásárlás meghosszabbítja az előfizetésedet a megvásárolt hónapok számával. Például, ha vásárolsz 3 hónap Primal Prémiumot a Primal webalkalmazáson keresztül, majd újra előfizetsz a mobil eszközödön, az előfizetésed lejárati dátuma négy hónap múlva lesz, és minden további havi fizetéssel tovább fog nőni.',
  },
  {
    question: 'Ha telefonon vásárolom meg a Primal Prémiumot, elérhetem a weben is?',
    answer: 'Igen. A Primal Prémium előfizetésed a Noszter fiókhoz van rendelve. Ezért függetlenül attól, hogy hogyan döntesz előfizetni, a Primal Prémium előfizetésed minden Primal alkalmazásban elérhető lesz: weben, iOS-en és Androidon.',
  },
  {
    question: 'Hogyan működik a Noszter kapcsolati lista biztonsági mentési funkció?',
    answer: 'A Primal biztonsági mentést készít a Noszter követési listád 100+ legutóbbi verziójáról. Ha a követési listád törlődik vagy megsérül egy másik Noszter alkalmazás miatt, a Primal Prémium felhasználók a Noszter Eszközök szekcióban található Kapcsolati Lista Biztonsági Mentése eszközzel visszaállíthatják azt.',
  },
  {
    question: 'Hogyan működik a Noszter fiók tartalom biztonsági mentési funkció?',
    answer: 'A Primal archiválja az összes Noszter tartalmad teljes előzményeit. A Primal Prémium felhasználók a Noszter Eszközök szekcióban található Tartalom Biztonsági Mentése eszközzel bármikor újraküldhetik tartalmaik tetszőleges részhalmazát a kiválasztott relékre.',
  },
  {
    question: 'Milyen más prémium funkciók várhatók a jövőben?',
    answer: 'Rengeteg új és izgalmas funkción dolgozunk a Primal Prémium számára. Ahogy közeledünk a megjelenésükhöz, be fogjuk jelenteni őket. Addig is bátran vedd fel velünk a kapcsolatot, és oszd meg velünk, milyen funkciókat látnál szívesen a Primal Prémiumban. Minden javaslatot szívesen fogadunk!',
  },
  {
    question: 'Szeretném támogatni a Primalt. Hogyan segíthetek?',
    answer: 'A Primal nem támaszkodik hirdetésekre. Nem tesszük pénzzé a felhasználói adatokat. Munkánkat nyílt forráskóddal tesszük elérhetővé, hogy segíthessünk a Noszter közösség fejlődésében. Ha szeretnéd segíteni, hogy továbbra is végezhessük ezt a munkát, kérlek nézd meg, hogyan <a data-link="support">támogathatod a munkánkat</a>. Köszönjük az egész Primal csapat nevében! 🙏❤️',
  },
]

const PremiumFeaturesDialog: Component<{
  open: 'features' | 'faq' | undefined,
  setOpen: (v: boolean) => void,
}> = (props) => {

  const navigate = useNavigate();

  const [activeTab, setActiveTab] = createSignal<'features' | 'faq'>('features');

  const onClick = (e: MouseEvent) => {
    const t = e.target;

    // @ts-ignore
    const link = t?.getAttribute('data-link');

    if (!link) return;

    if (link === 'support') {
      props.setOpen(false);
      navigate('/premium/support');
      return;
    }

    if (link === 'terms') {
      props.setOpen(false);
      // @ts-ignore
      window.open(`${location.origin}/terms`, '_blank').focus();
      return;
    }
  };

  onMount(() => {
    window.addEventListener('click', onClick);
  });

  onCleanup(() => {
    window.removeEventListener('click', onClick);
  })

  createEffect(() => {
    const open = props.open;

    if (open !== undefined) {
      setActiveTab(() => open);
    }
  })

  const featureInfo = (featureTik: string) => {
    if (featureTik === 'true') {
      return <div class={styles.checkIcon}></div>
    }

    if (featureTik === 'false') return <></>;

    return <>{featureTik}</>;
  }

  return (
    <AdvancedSearchDialog
      open={props.open !== undefined}
      setOpen={props.setOpen}
      triggerClass="hidden"
      title={
        <Tabs value={activeTab()} onChange={setActiveTab}>
          <Tabs.List class={styles.premiumFeaturesTabs}>
            <Tabs.Trigger class={styles.premiumFeaturesTab} value="features">
              Prémium Funkciók
            </Tabs.Trigger>
            <Tabs.Trigger class={styles.premiumFeaturesTab} value="faq">
              Prémium Kérdések
            </Tabs.Trigger>
            <Tabs.Indicator class={styles.premiumFeaturesTabIndicator} />
          </Tabs.List>
        </Tabs>
      }
    >
      <div class={styles.premiumFeatures}>

        <Tabs value={activeTab()} >
          <Tabs.Content value="features" >
            <div class={styles.tabContentPremiumFeatures}>
              <table>
                <thead>
                  <tr>
                    <th>Funkció</th>
                    <th>Primal Ingyenes</th>
                    <th>Primal Prémium</th>
                  </tr>
                </thead>

                <tbody>
                  <For each={premiumFeatures}>
                    {(feature, index) => (
                      <tr>
                        <td class={styles.fname}>
                          <span>{feature.name}</span>
                          <Show when={feature.help}>
                            <HelpTip above={true} zIndex={index() + 1}>
                              <span>{feature.help}</span>
                            </HelpTip>
                          </Show>
                        </td>
                        <td class={styles.ftick}>{featureInfo(feature.free)}</td>
                        <td class={styles.ftick}>{featureInfo(feature.premium)}</td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
          </Tabs.Content>
          <Tabs.Content value="faq" >
            <div class={styles.tabContentPremiumFeatures}>
                <For each={faq}>
                  {q => (
                    <div class={styles.faq}>
                      <div class={styles.question}>
                        {q.question}
                      </div>
                      <div class={styles.answer} innerHTML={q.answer}>
                      </div>
                    </div>
                  )}
                </For>
              </div>
          </Tabs.Content>
        </Tabs>

        <div class={styles.premiumFeaturesFooter}>
          <ButtonSecondary
            light={true}
            onClick={() => props.setOpen(false)}
          >
            Bezárás
          </ButtonSecondary>
        </div>
      </div>
    </AdvancedSearchDialog>
  );
}

export default PremiumFeaturesDialog
