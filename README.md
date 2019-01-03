# Serwer zawodów UMPGGK 2019

Uczelniane Mistrzostwa Programów Grających w gry Kombinatoryczne są cyklicznym konkursem rozgrywanym w Instytucie Informatyki Uniwersytetu Śląskiego. 
Niniejsze repozytorium zawiera kod serwera służącego do rozegrania gier turniejowych w grze __Amazons__ w V edycji UMPGGK.

## Instalacja serwera

Do instalacji serwera oraz jego uruchomienia potrzebne są narzędzia [git](https://git-scm.com/) oraz [node.js](https://nodejs.org/en/).
W czasie testów korzystaliśmy z __node.js__ w wersji 11.1.0 oraz __git__ w wersji 2.20.1.

Aby zainstalować serwer należy pobrać pliki z repozytorium oraz ściągnąć wymagane biblioteki przy pomocy narzędzia **npm** (które powinno być zainstalowane wraz z __node.js__):
```
git clone https://github.com/lazarow/umpggk2019-server.git
cd umpggk2019-server
npm install
```
Serwer jest gotowy do uruchomienia.

## Uruchomienie serwera

```
Komenda:
    npm start -- [parametry]
Parametry (wszystkie parametry są opcjonalne)
    --port={port}
        port serwera, domyślnie 6789
    --register={nazwa pliku}
        plik, w którym zapisane zostaną dane turnieju, domyślnie: ./tournament-register.json
    --system={system}
        system parowania graczy, dostępne opcje: roundrobin oraz mcmahon
    --nofgames={liczba gier}
        liczba gier w pojedynczym meczu, domyślnie 10
    --timelimit={limit w ms}
        limit czasowy na pojedynczy ruch, domyślnie 2000
    --autostart
        uruchamia tryb automatycznego startu kolejnych rund, po za pierwszą rundą
    --nosaving
        flaga wyłącza zapis turnieju do pliku
    --restore
        przywróć dane turnieju z pliku
```

Przykład:
```
npm start -- --autostart --nofgames=1
```

Uruchomiony serwer nasłuchuje na uczetników turnieju, aby rozpocząć pierwszą rundę należy wprowadzić w terminalu, w którym uruchomiono serwer, komendę administratora `start`.

Przykład:
```
03/03/2019 14:06:47.962 Info: The server is listening on the address: :: and the port: 6789
start
03/03/2019 14:08:08.061 Info: The ADMINISTRATOR's command received: start
03/03/2019 14:08:08.065 Info: The round #0 has been started with 0 matches
03/03/2019 14:08:08.066 Info: No matches were found hence the tournament is over
```

## Turniej

Turniej składa się z rund, których liczba wyliczana jest w zależności od liczby zawodników i systemu. Rundy
składają się z meczy, mecze składają się z gier. Wynik meczu określany jest na podstawie stosunku wygranych gier pomiędzy zawodnikami.

Turniej rozgrywany jest automatycznie, kolejne rundy uruchamiane są ręcznie (za pomocą komendy `start`) lub samoczynnie (uruchomienie serwera z parameterem `--autostart`).

## Protokół komunikacyjny

Protokół komunikacyjny oparty jest o standardowe gniazdka sieciowe, każda komenda wysyłana z lub do serwera powinna kończyć się znakiem nowej linii. Używane w protokole koordynaty pozycji
są zgodne z opisem planszy do gry [Amazons](https://en.wikipedia.org/wiki/Game_of_the_Amazons).

### Żądania klient (wysyłają programy grające w turnieju)

```
100 [nazwa_gracza]	// Podłącz się jako gracz, nazwa gracza nie może zawierać białych znakow
210 [pozycja]		// Wyślij ruch, gdzie pozycja to wspołrzędne ruchu "kto cel cel_strzały" (spacja w środku)
```

Przykłady:
```
100 testowy_gracz
210 g6 h6 i7
```

### Odpowiedzi serwera

```
200 [opis gry]		// Komunikat oznacza rozpoczęcie nowej gry, należy oczekiwać koloru gracza rozmiarow planszy oraz pozycji początkowej
220 [pozycja]		// Nowa pozycja przeciwnika, serwer oczekuje na Twój ruch, zgodnie z pozycją wyzej
230			// Wygrałeś wg. zasad
231			// Wygrałeś przez przekroczenie czasu (przeciwnika)
232			// Wygrałeś przez rozłączenie się przeciwnika
240			// Przegrałeś wg. zasad
241			// Przegrałeś przez przekroczenie czasu
299 [miejsce]		// Koniec turnieju
999 [opis]		// Błąd komendy, opis powinien wyjaśnić przyczyne
```

Przykłady:
```
200 black 10 ...w..w.......................w........w....................b........b.......................b..b...
220 g3 g4 f5
299 3
```

## Losowi gracze

Serwer posiada implementację losowych graczy (można stworzyć ich dowolną liczbę), aby ich uruchomić należy posłużyć się następującą komendą:
```
Komenda:
    node ./src/client/index.js [parametry]
Parametry (wszystkie parametry są opcjonalne)
    --host={host}
        adres IP serwera, domyślnie 127.0.0.1
    --port={port}
        port serwera, domyślnie 6789
    --nofclients={liczba klientów}
        liczba losowych klientów, domyślnie 2
```

## Uwaga

Serwer jest ukończony aczkolwiek autor zastrzega sobie prawo do jego modyfikacji.


