let itens = new Array();
const urlNoticias = '/posts/summary/-/~Not%C3%ADcia?max-results=1000&alt=json';
const urlDestaques = '/posts/summary/-/~Destaque?max-results=1000&alt=json';
const urlGB = 'https://www.blogger.com/feeds/4548646345780114575';
const urlNB = 'https://www.blogger.com/feeds/5475675974957417512';
let redatores = new Array();
let verificaRedator = new Array();
const meses = [
   'Janeiro',
   'Fevereiro',
   'Março',
   'Abril',
   'Maio',
   'Junho',
   'Julho',
   'Agosto',
   'Setembro',
   'Outubro',
   'Novembro',
   'Dezembro',
];

//Faz uma chamada Ajax e recebe os dados em formato JSON
function recuperaDadosFeedJson(strBlastId) {
   //Encapsulando chamada JSON com deferred
   chamada = $.Deferred(function (def) {
      $.ajax({
         url: strBlastId,
         type: 'get',
         dataType: 'jsonp',
         async: true,
         success: function (json) {
            for (const entry of json.feed.entry) {
               itens.push(entry);
            }
            def.resolve(); //Resolvendo o defered, dizendo que terminou a chamada JSON
         },
      });
   }).promise();
   return chamada;
}

//Processa os itens JSON para objetos JS
function formataDados(tipo) {
   for (const entry of itens) {
      let redator = {
         nome: '',
         links: [],
      };
      redator.nome = entry.author[0].name.$t;

      let link = {
         titulo: '',
         url: '',
         tipo: '',
         semana: 0,
      };

      link.tipo = tipo;
      link.titulo = entry.title.$t;
      //TODO alterar
      jQuery.each(entry.link, function (i, url) {
         if (url.rel == 'alternate') {
            link.url = url.href;
            return false;
         }
      });
      link.data = entry.published.$t;

      verificaRedator = redatores.find(
         (redatores) => redatores['nome'] === redator.nome
      );

      if (!verificaRedator) {
         redator.links.push(link);
         redatores.push(redator);
      } else {
         verificaRedator.links.push(link);
      }
   }
   redatores.sort(ordenaNomesAsc);
}

//Ordena de forma ascendente os redatores pelo nome
function ordenaNomesAsc(a, b) {
   return b.nome.toUpperCase() < a.nome.toUpperCase() ? 1 : -1;
}

//Transforma uma string de data para o formado dd/mm/yyyy
function formataData(data) {
   if (data.indexOf('-03:00') > 0) {
      data = data.substring(0, data.indexOf('-03:00'));
   } else {
      data = data.substring(0, data.indexOf('-02:00'));
   }
   const d = new Date(data);
   return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

//converte uma data para o formato UTC
function converteDataParaUTC(data) {
   el = data.split('/');
   if (el[0].length < 2) el[0] = '0' + el[0];
   if (el[1].length < 2) el[1] = '0' + (el[1] - 1);
   return el[2] + '-' + el[1] + '-' + el[0] + 'T00:00:00-03:00';
}

function recuperaDados(blast, ano, mes) {
   let chamada = null;
   let url = '';
   redatores = [];
   itens = [];

   url = blast == 'NB' ? urlNB : urlGB;

   url += urlNoticias;
   url +=
      '&published-min=' +
      converteDataParaUTC(
         moment()
            .year(ano)
            .month(mes)
            .date('1')
            .startOf('isoWeek')
            .format('DD/MM/YYYY')
      );
   url +=
      '&published-max=' +
      converteDataParaUTC(
         moment()
            .year(ano)
            .month(mes)
            .date('31')
            .endOf('isoWeek')
            .format('DD/MM/YYYY')
      );

   //Notícias
   chamada = recuperaDadosFeedJson(url);

   $.when(chamada).done(function () {
      formataDados('N');
      url = blast == 'NB' ? urlNB : urlGB;
      url += urlDestaques;
      url +=
         '&published-min=' +
         converteDataParaUTC(
            moment()
               .year(ano)
               .month(mes)
               .date('1')
               .startOf('isoWeek')
               .format('DD/MM/YYYY')
         );
      url +=
         '&published-max=' +
         converteDataParaUTC(
            moment()
               .year(ano)
               .month(mes)
               .date('31')
               .endOf('isoWeek')
               .format('DD/MM/YYYY')
         );
      //Destaques
      chamada2 = recuperaDadosFeedJson(url);
      itens = new Array();
      $.when(chamada2).done(function () {
         formataDados('D');
         montaTabela(ano, mes);
      });
   });
}

//Monta a tabela com todos os dados recuperados
function montaTabela(ano, mes) {
   const tabela = document.getElementById('tabela');
   for (const [i, redator] of redatores.entries()) {
      let celulasND = '';
      let qtdNoticias = 0;
      let qtdDestaques = 0;
      let links = `<tr id='info${i}' style='display:none !important'><td colspan='100'><table class='table table-hover table-condensed'><tr id='infoh${i}'><th>Data</th><th>Tipo</th><th>Título</th></tr>`;
      let dataMes = moment().year(ano).month(mes).date('1');

      for (const [i, link] of redator.links.entries()) {
         links += `<tr id='infol${i}'><td>${formataData(link.data)}</td><td>
         ${link.tipo}</td><td><a href='${link.url}'>
         ${link.titulo}</a></td></tr>`;
      }
      links += '</table></td></tr>';

      do {
         qtdNoticias = 0;
         qtdDestaques = 0;
         for (const linke of redator.links) {
            if (
               dataMes.startOf('isoWeek').date() ==
               moment(formataData(linke.data), 'DD/MM/YYYY')
                  .startOf('isoWeek')
                  .date()
            ) {
               linke.tipo == 'N' ? qtdNoticias++ : qtdDestaques++;
            }
         }
         dataMes.add(7, 'd');
         celulasND += `<td style='border-left: 1px solid #ddd;'>${qtdNoticias}</td><td style='border-right: 1px solid #ddd;'>${qtdDestaques}</td>`;
      } while (dataMes.startOf('isoWeek').month() == mes);

      tabela.insertAdjacentHTML(
         'beforeend',
         `<tr><td onClick="$('#info${i}').toggle()" class='fakelink'>${redator.nome}</td>${celulasND}</tr>`
      );
      tabela.insertAdjacentHTML('beforeend', links);
   }
   $('#imgLoading').hide('fast');
   $('#resultado').show('fast');
   $('#botaoPesquisar').prop('disabled', false);
}

//Event Listener para o evento keyup de #campoBusca
//Filtra a linha das tabelas (coluna redator) de acordo com o texto parcial digitado
$('#campoBusca').keyup(function () {
   let rows = $('#tabela').find('tr:not([id*=info])').hide();
   if (this.value.length) {
      let data = this.value.toUpperCase().split(' ');
      $.each(data, function (i, v) {
         rows.filter(`:icontains('${v}'):not([id*=info])`).show();
      });
   } else rows.show();
});

jQuery.expr[':'].icontains = function (a, i, m) {
   return jQuery(a).text().toUpperCase().indexOf(m[3].toUpperCase()) >= 0;
};

//Cria os dropdowns dos anos e dos meses
function criaDropdowns() {
   const dropAno = document.getElementById('selectAno');
   const dropMes = document.getElementById('selectMes');

   for (i = 0; i < 3; i++) {
      dropAno.insertAdjacentHTML(
         'beforeend',
         `<option value='${moment().year() - i}'>${
            moment().year() - i
         }</option>`
      );
   }
   for (i = meses.length - 1; i >= 0; i--) {
      if (moment().month() == i) {
         dropMes.insertAdjacentHTML(
            'beforeend',
            `<option value='${i}' selected='true'>${meses[i]}</option>`
         );
      } else {
         dropMes.insertAdjacentHTML(
            'beforeend',
            `<option value='${i}'>${meses[i]}</option>`
         );
      }
   }
}

//Cria a linha de cabeçalho da tabela
function criaCabecalho(ano, mes) {
   const data = moment().year(ano).month(mes).date('1');
   const cabecalho = document.getElementById('cabecalho');
   const cabecalho2 = document.getElementById('cabecalho-interno');
   cabecalho.innerHTML = '';
   cabecalho2.innerHTML = '';
   cabecalho.insertAdjacentHTML(
      'beforeend',
      "<th rowspan='2' style='vertical-align: middle;'>Redator</th>"
   );
   do {
      cabecalho.insertAdjacentHTML(
         'beforeend',
         `<th colspan='2' style='border: 1px solid #ddd;'>
         ${data.startOf('isoWeek').date()}/
         ${data.startOf('isoWeek').month() + 1}</th>`
      );
      cabecalho2.insertAdjacentHTML(
         'beforeend',
         "<th style='border: 1px solid #ddd;'>N</th><th style='border: 1px solid #ddd;'>D</th>"
      );
      data.add(7, 'd');
   } while (data.startOf('isoWeek').month() == mes);
}

//Pesquisa os dados do mês selecionado
function pesquisarIntervalo(evento) {
   evento.preventDefault();
   const ano = $('#selectAno').val();
   const mes = $('#selectMes').val();
   const blast = $('#botoesBlasts input:checked').attr('id');
   recuperaDados(blast, ano, mes);
   criaCabecalho(ano, mes);
   $('#imgLoading').show('fast');
   $('#resultado').hide();
   $('#tabela').empty();
   $('#botaoPesquisar').prop('disabled', true);
}

window.onload = function () {
   criaDropdowns();
};
